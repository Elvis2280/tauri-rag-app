import { useInfiniteQuery } from "@tanstack/react-query";
import {
  HISTORY_PAGE_SIZE,
  HISTORY_QUERY_CACHE_TIME,
  HISTORY_QUERY_STALE_TIME,
} from "@/constants/history";
import { HISTORY_ENDPOINTS } from "@/lib/api/endpoints";
import apiRag from "@/lib/axios";
import { FILE_STATUS, type HistoryEntry, type statusFileType } from "@/types/FileTypes";
import type {
  ApiHistoryListItem,
  ApiHistoryListResponse,
  HistoryFilters,
} from "@/types/HistoryTypes";

const historyKeyRoot = ["history"] as const;

type ApiHistoryListPage = ApiHistoryListResponse & { fetchedAt: number };

export const historyKeys = {
  all: historyKeyRoot,
  lists: () => [...historyKeyRoot, "list"] as const,
  list: (filters: HistoryFilters) => [...historyKeys.lists(), filters] as const,
};

function isFileStatus(status: string): status is statusFileType {
  return Object.values(FILE_STATUS).some((candidate) => candidate === status);
}

function parseStatus(status: string): statusFileType {
  return isFileStatus(status) ? status : FILE_STATUS.FILE_UPLOADED;
}

function parseProgress(step: string | null): {
  step: number | null;
  stepTotal: number | null;
} {
  if (!step) return { step: null, stepTotal: null };

  const segments = step.split("/");
  if (segments.length > 2) return { step: null, stepTotal: null };

  const [stepValue, totalValue] = segments;
  const parsedStep = Number(stepValue);
  const parsedTotal = totalValue === undefined ? null : Number(totalValue);

  return {
    step:
      Number.isInteger(parsedStep) && stepValue.trim() !== ""
        ? parsedStep
        : null,
    stepTotal:
      parsedTotal !== null &&
      Number.isInteger(parsedTotal) &&
      totalValue.trim() !== ""
        ? parsedTotal
        : null,
  };
}

export function mapHistoryItem(item: ApiHistoryListItem): HistoryEntry {
  const progress = parseProgress(item.step);

  return {
    file_id: item.document_id,
    workspaceId: item.workspace_id,
    originalFilename: item.original_filename,
    workspaceName: item.workspace_name,
    message: item.message,
    status: parseStatus(item.status),
    timestamp: item.created_at,
    step: progress.step,
    stage: item.stage,
    pageNumber: item.page_number,
    totalPages: item.total_pages,
    stepTotal: progress.stepTotal,
    error: item.error,
  };
}

function buildHistoryListPath(
  filters: HistoryFilters,
  cursor?: string,
): string {
  const params = new URLSearchParams({
    sort: filters.sort,
    status: filters.status,
    limit: String(HISTORY_PAGE_SIZE),
  });

  if (filters.workspaceId) params.set("workspace", filters.workspaceId);
  if (cursor) params.set("cursor", cursor);

  return `${HISTORY_ENDPOINTS.list}?${params.toString()}`;
}

async function fetchHistoryList(
  filters: HistoryFilters,
  cursor?: string,
): Promise<ApiHistoryListPage> {
  const fetchedAt = Date.now();
  const response = await apiRag.get<ApiHistoryListResponse>(
    buildHistoryListPath(filters, cursor),
  );
  return { ...response.data, fetchedAt };
}

export function useHistoryList(filters: HistoryFilters) {
  return useInfiniteQuery<ApiHistoryListPage, Error>({
    queryKey: historyKeys.list(filters),
    queryFn: ({ pageParam }) =>
      fetchHistoryList(
        filters,
        typeof pageParam === "string" ? pageParam : undefined,
      ),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    staleTime: HISTORY_QUERY_STALE_TIME,
    cacheTime: HISTORY_QUERY_CACHE_TIME,
  });
}
