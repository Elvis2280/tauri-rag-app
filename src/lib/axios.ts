import { Channel, invoke } from '@tauri-apps/api/core';

type NativeApiResponse<TBody = unknown> = { status: number; body: TBody };

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

export type CredentialStatus = { configured: boolean };

export function getCredentialStatus(): Promise<CredentialStatus> {
  return invoke<CredentialStatus>('get_credential_status');
}

export function saveCredential(apiKey: string): Promise<void> {
  return invoke('validate_and_save_credential', { apiKey });
}

export function clearCredential(): Promise<void> {
  return invoke('clear_credential');
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
  void invoke('watch_document', { fileId, channel }).catch(onError);
  return { disconnect: () => void invoke('stop_document_watch', { fileId }) };
}

export default apiRag;
