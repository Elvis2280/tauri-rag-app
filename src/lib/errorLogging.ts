import { invoke } from '@tauri-apps/api/core';
import { error as writeLogError } from '@tauri-apps/plugin-log';

export type FrontendFailureStage = 'request' | 'download' | 'rendering';
export type FrontendFailureReason =
  | 'http'
  | 'network'
  | 'invalid_response'
  | 'render'
  | 'request';
export type HttpMethod = 'GET' | 'POST';

export type FrontendFailure = {
  stage: FrontendFailureStage;
  method: HttpMethod;
  path: string;
  status: number | null;
  reason: FrontendFailureReason;
};

function toLogPath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0]?.replace(/^\/+|\/+$/g, '') ?? '';
  const parts = pathname.split('/');

  if (
    ['workspace', 'workspace/list', 'workspace/tree', 'documents/upload', 'chat'].includes(pathname)
  ) {
    return `/${pathname}`;
  }

  if (parts.length === 3 && parts[0] === 'workspace' && parts[2] === 'disable') {
    return '/workspace/:id/disable';
  }

  if (
    parts.length === 3 &&
    parts[0] === 'documents' &&
    ['pdf', 'markdown', 'images'].includes(parts[2] ?? '')
  ) {
    return `/documents/:id/${parts[2]}`;
  }

  return '/unknown';
}

function validStatus(status: number | null): number | null {
  return Number.isInteger(status) && status !== null && status >= 100 && status <= 599
    ? status
    : null;
}

export async function logFrontendFailure(failure: FrontendFailure): Promise<void> {
  const safeFailure: FrontendFailure = {
    stage: failure.stage,
    method: failure.method,
    path: toLogPath(failure.path),
    status: validStatus(failure.status),
    reason: failure.reason,
  };

  try {
    await writeLogError(`[frontend_failure] ${JSON.stringify(safeFailure)}`);
  } catch {
    // Diagnostics must never interrupt the request or viewer error handling.
  }
}

export async function openLogsFolder(): Promise<void> {
  await invoke('open_logs_folder');
}
