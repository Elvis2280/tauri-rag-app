import { Channel, invoke } from '@tauri-apps/api/core';
import {
  logFrontendFailure,
  type FrontendFailureReason,
  type FrontendFailureStage,
  type HttpMethod,
} from '@/lib/errorLogging';

type NativeApiResponse<TBody = unknown> = { status: number; body: TBody };
type NativeChatJobResponse<TBody> = { status: number; body: TBody; retryAfter: string | null };

type NativeCommandError = { message: string };

export type ApiErrorResponse = { status: number; data: unknown };

export class ApiError extends Error {
  readonly response: ApiErrorResponse;

  constructor(response: ApiErrorResponse) {
    super(`API request failed with status ${response.status}`);
    this.name = 'ApiError';
    this.response = response;
  }
}

export class BinaryApiError extends Error {
  readonly status: number | null;
  readonly reason: FrontendFailureReason;

  constructor(message: string, status: number | null, reason: FrontendFailureReason) {
    super(message);
    this.name = 'BinaryApiError';
    this.status = status;
    this.reason = reason;
  }
}

type ApiClient = {
  get<T>(path: string): Promise<{ data: T }>;
  getBinary(path: string): Promise<{ data: Uint8Array }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
  chatJob<T>(
    method: 'GET' | 'POST',
    path: string,
    idempotencyKey: string,
    body?: unknown,
  ): Promise<{ status: number; data: T; retryAfter: string | null }>;
  patch<T>(path: string, body: unknown): Promise<{ data: T }>;
};

function hasMessage(value: object): value is NativeCommandError {
  return 'message' in value && typeof value.message === 'string';
}

export function normalizeNativeError(
  error: unknown,
  fallback: string,
): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  if (typeof error === 'object' && error !== null && hasMessage(error)) {
    return new Error(error.message);
  }
  return new Error(fallback);
}

function throwForStatus(response: NativeApiResponse): void {
  if (response.status >= 400) {
    throw new ApiError({ status: response.status, data: response.body });
  }
}

function reportApiFailure(
  stage: FrontendFailureStage,
  method: HttpMethod,
  path: string,
  status: number | null,
  reason: FrontendFailureReason,
): void {
  void logFrontendFailure({ stage, method, path, status, reason });
}

function isFailureReason(value: unknown): value is FrontendFailureReason {
  return (
    value === 'http' ||
    value === 'network' ||
    value === 'invalid_response' ||
    value === 'render' ||
    value === 'request'
  );
}

function normalizeBinaryApiError(error: unknown): BinaryApiError {
  if (error instanceof BinaryApiError) return error;

  if (typeof error === 'object' && error !== null && hasMessage(error)) {
    const candidateStatus = 'status' in error ? error.status : null;
    const candidateReason = 'reason' in error ? error.reason : null;
    const status =
      typeof candidateStatus === 'number' &&
      Number.isInteger(candidateStatus) &&
      candidateStatus >= 100 &&
      candidateStatus <= 599
        ? candidateStatus
        : null;
    const reason = isFailureReason(candidateReason) ? candidateReason : 'request';
    return new BinaryApiError(error.message, status, reason);
  }

  return new BinaryApiError(
    normalizeNativeError(error, 'Unable to download the file').message,
    null,
    'network',
  );
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<{ data: T }> {
  const normalizedPath = path.replace(/^\/+/, '');
  try {
    const response = await invoke<NativeApiResponse<T>>('api_request', {
      request: { method, path: normalizedPath, body },
    });
    try {
      throwForStatus(response);
    } catch (error) {
      reportApiFailure('request', method, normalizedPath, response.status, 'http');
      throw error;
    }
    return { data: response.body };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      reportApiFailure('request', method, normalizedPath, null, 'network');
    }
    throw error;
  }
}

async function requestBinary(path: string): Promise<{ data: Uint8Array }> {
  const normalizedPath = path.replace(/^\/+/, '');
  try {
    const data = await invoke<Uint8Array>('api_binary_request', {
      request: { method: 'GET', path: normalizedPath, body: undefined },
    });
    return { data };
  } catch (error) {
    const failure = normalizeBinaryApiError(error);
    reportApiFailure(
      'download',
      'GET',
      normalizedPath,
      failure.status,
      failure.reason,
    );
    throw failure;
  }
}

export async function requestChatJob<T>(
  method: 'GET' | 'POST',
  path: string,
  idempotencyKey: string,
  body?: unknown,
): Promise<{ status: number; data: T; retryAfter: string | null }> {
  const normalizedPath = path.replace(/^\/+/, '');
  const isSubmit =
    method === 'POST' && normalizedPath === 'chat/jobs' && body !== undefined;
  const isPoll =
    method === 'GET' &&
    /^chat\/jobs\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      normalizedPath,
    ) &&
    body === undefined;
  if (!isSubmit && !isPoll) throw new Error('Chat job request is invalid');

  try {
    const response = await invoke<NativeChatJobResponse<T>>('chat_job_request', {
      request: { method, path: normalizedPath, body },
      idempotencyKey,
    });
    return {
      status: response.status,
      data: response.body,
      retryAfter: response.retryAfter,
    };
  } catch (error) {
    reportApiFailure('request', method, normalizedPath, null, 'network');
    throw normalizeNativeError(error, 'Unable to reach the RAG API');
  }
}

function encodeUploadMetadata(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function uploadFile<T>(
  path: string,
  formData: FormData,
  documentId?: string,
): Promise<{ data: T }> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('Upload form data is invalid');
  }
  const workspaceId = formData.get('workspace_id');
  if (documentId === undefined && typeof workspaceId !== 'string') {
    throw new Error('Upload form data is invalid');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const normalizedPath = path.replace(/^\/+/, '');
  try {
    const response = await invoke<NativeApiResponse<T>>('upload_document', bytes, {
      headers: {
        'x-upload-metadata': encodeUploadMetadata({
          ...(documentId ? { document_id: documentId } : { workspace_id: workspaceId }),
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          path: normalizedPath,
        }),
      },
    });
    try {
      throwForStatus(response);
    } catch (error) {
      reportApiFailure('request', documentId ? 'PATCH' : 'POST', normalizedPath, response.status, 'http');
      throw error;
    }
    return { data: response.body };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      reportApiFailure('request', documentId ? 'PATCH' : 'POST', normalizedPath, null, 'network');
    }
    throw error;
  }
}

export const apiRag: ApiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  getBinary: requestBinary,
  post: <T>(path: string, body?: unknown) => {
    if (body instanceof FormData) return uploadFile<T>(path, body);
    return request<T>('POST', path, body);
  },
  chatJob: requestChatJob,
  patch: <T>(path: string, body: unknown) => {
    if (body instanceof FormData) {
      const match = path.match(/^\/?documents\/([0-9a-f-]{36})$/i);
      if (!match || !body.has('file')) {
        throw new Error('Document replacement request is invalid');
      }
      return uploadFile<T>(path, body, match[1]);
    }
    return request<T>('PATCH', path, body);
  },
};

export type AccessSettingsStatus = {
  configured: boolean;
  serverHost: string;
};

export async function getAccessSettings(): Promise<AccessSettingsStatus> {
  try {
    return await invoke<AccessSettingsStatus>('get_access_settings');
  } catch (error) {
    throw normalizeNativeError(
      error,
      'Unable to load the API access settings',
    );
  }
}

export async function saveAccessSettings(
  apiKey: string,
  serverHost: string,
): Promise<AccessSettingsStatus> {
  try {
    return await invoke<AccessSettingsStatus>(
      'validate_and_save_access_settings',
      { apiKey, serverHost },
    );
  } catch (error) {
    throw normalizeNativeError(
      error,
      'The API access settings could not be validated.',
    );
  }
}

export async function updateApiKey(apiKey: string): Promise<void> {
  try {
    await invoke('validate_and_save_api_key', { apiKey });
  } catch (error) {
    throw normalizeNativeError(error, 'The API key could not be saved.');
  }
}

export async function updateServerHost(serverHost: string): Promise<string> {
  try {
    return await invoke<string>('validate_and_save_server_host', {
      serverHost,
    });
  } catch (error) {
    throw normalizeNativeError(error, 'The server host could not be saved.');
  }
}

export async function validateSavedAccess(): Promise<void> {
  try {
    await invoke('validate_saved_access');
  } catch (error) {
    const status =
      typeof error === 'object' && error !== null && 'status' in error &&
      typeof error.status === 'number' &&
      Number.isInteger(error.status) &&
      error.status >= 100 &&
      error.status <= 599
        ? error.status
        : null;
    const code =
      typeof error === 'object' && error !== null && 'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : null;
    reportApiFailure(
      'request',
      'GET',
      'workspace/list',
      status,
      status !== null ? 'http' : code === 'connection' ? 'network' : 'request',
    );
    throw normalizeNativeError(
      error,
      'The saved API access settings could not be validated.',
    );
  }
}

export type NativeProgressEvent = {
  payload?: Record<string, unknown>;
  error?: string;
};

export function watchDocument(
  fileId: string,
  onMessage: (payload: Record<string, unknown>) => void,
  onError: (error: unknown) => void,
): { disconnect: () => void } {
  const channel = new Channel<NativeProgressEvent>();
  channel.onmessage = (event) => {
    if (event.error) {
      onError(new Error(event.error));
    } else if (event.payload) {
      onMessage(event.payload);
    }
  };
  void invoke('watch_document', { fileId, channel }).catch((error: unknown) =>
    onError(normalizeNativeError(error, 'Unable to connect to the document status stream')),
  );
  return {
    disconnect: () =>
      void invoke('stop_document_watch', { fileId }).catch((error: unknown) =>
        onError(normalizeNativeError(error, 'Unable to stop the document status stream')),
      ),
  };
}

export default apiRag;
