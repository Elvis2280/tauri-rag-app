const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';
const DEFAULT_WS_BASE_URL = 'ws://localhost:8080';

export function normalizeBaseUrl(
  value: string | undefined,
  fallback: string,
): string {
  const baseUrl = value?.trim() || fallback;
  return baseUrl.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  DEFAULT_API_BASE_URL,
);

export const WS_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_WS_BASE_URL,
  DEFAULT_WS_BASE_URL,
);

export function buildWebSocketUrl(path: string): string {
  if (!path) {
    throw new Error('No path provided...');
  }

  const baseURL = `${WS_BASE_URL.replace(/\/+$/, '')}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  const url = new URL(normalizedPath, baseURL);

  return url.toString();
}
