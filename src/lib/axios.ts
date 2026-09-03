import { Channel, invoke } from '@tauri-apps/api/core';

type NativeApiResponse<TBody = unknown> = { status: number; body: TBody };

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

type ApiClient = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
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

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ data: T }> {
  const normalizedPath = path.replace(/^\/+/, '');
  const response = await invoke<NativeApiResponse<T>>('api_request', {
    request: { method, path: normalizedPath, body },
  });
  throwForStatus(response);
  return { data: response.body };
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
): Promise<{ data: T }> {
  const workspaceId = formData.get('workspace_id');
  const file = formData.get('file');
  if (typeof workspaceId !== 'string' || !(file instanceof File)) {
    throw new Error('Upload form data is invalid');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const normalizedPath = path.replace(/^\/+/, '');
  const response = await invoke<NativeApiResponse<T>>('upload_document', bytes, {
    headers: {
      'x-upload-metadata': encodeUploadMetadata({
        workspace_id: workspaceId,
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        path: normalizedPath,
      }),
    },
  });
  throwForStatus(response);
  return { data: response.body };
}

export const apiRag: ApiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => {
    if (body instanceof FormData) return uploadFile<T>(path, body);
    return request<T>('POST', path, body);
  },
};

export type CredentialStatus = { configured: boolean; apiBaseUrl: string };

export async function getCredentialStatus(): Promise<CredentialStatus> {
  try {
    return await invoke<CredentialStatus>('get_credential_status');
  } catch (error) {
    throw normalizeNativeError(
      error,
      'Unable to access the operating system credential vault',
    );
  }
}

export async function saveCredential(apiKey: string): Promise<void> {
  try {
    await invoke('validate_and_save_credential', { apiKey });
  } catch (error) {
    throw normalizeNativeError(error, 'The API key could not be validated.');
  }
}

export async function clearCredential(): Promise<void> {
  try {
    await invoke('clear_credential');
  } catch (error) {
    throw normalizeNativeError(
      error,
      'Unable to remove the API credential',
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
