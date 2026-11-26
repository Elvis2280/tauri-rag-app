export type HistoryStatus = "active" | "complete";
export type HistorySort = "oldest" | "newest";

export type HistoryFilters = {
  status: HistoryStatus;
  workspaceId: string | null;
  sort: HistorySort;
};

export type ApiHistoryListItem = {
  document_id: string;
  original_filename: string;
  workspace_id: string;
  workspace_name: string;
  created_at: string;
  status: string;
  stage: string | null;
  step: string | null;
  message: string;
  page_number: number | null;
  total_pages: number | null;
  error: string | null;
};

export type ApiHistoryListResponse = {
  items: ApiHistoryListItem[];
  next_cursor: string | null;
};
