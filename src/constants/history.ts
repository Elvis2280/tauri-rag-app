import type { HistoryFilters } from "@/types/HistoryTypes";

export const UNKNOWN_FILE_LABEL = "Unknown file";
export const UNKNOWN_WORKSPACE_LABEL = "Unknown workspace";
export const MISSING_PAGE_LABEL = "—";
export const HISTORY_PAGE_SIZE = 50;
export const HISTORY_SKELETON_COUNT = 5;
export const HISTORY_QUERY_STALE_TIME = 5 * 60 * 1000;
export const HISTORY_QUERY_CACHE_TIME = 10 * 60 * 1000;
export const HISTORY_ALL_WORKSPACES = "all-workspaces";
export const HISTORY_LOAD_ERROR = "Unable to load file history.";
export const HISTORY_STORAGE_KEY = "rag-history";
export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  status: "active",
  workspaceId: null,
  sort: "oldest",
};

export const HISTORY_SORT_LABELS = {
  oldest: "Oldest first",
  newest: "Newest first",
} as const;

export const HISTORY_RETRY_MESSAGES = {
  pending: "Retrying…",
  queued: "Retry queued",
  running: "Retry in progress",
  error: "Failed to retry file process",
} as const;

export const HISTORY_CANCELLATION_MESSAGES = {
  confirmTitle: "Cancel this file process?",
  confirmDescription:
    "This will stop processing, undo its progress, and permanently delete the document record and its vector database entries. This action cannot be undone.",
  confirmButton: "Cancel process",
  pending: "Cancellation requested",
  error: "Failed to cancel file process",
  cleanupError: "Unable to finish cancelling this file",
  pollingIntervalMs: 2_000,
} as const;
