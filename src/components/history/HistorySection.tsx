import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_HISTORY_FILTERS,
  HISTORY_LOAD_ERROR,
  HISTORY_SKELETON_COUNT,
} from "@/constants/history";
import { useHistory } from "@/context/HistoryContext";
import { useGlobalContext } from "@/context/GlobalContext";
import { useHistoryList, mapHistoryItem } from "@/hooks/useHistoryList";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { FILE_STATUS, type HistoryEntry } from "@/types/FileTypes";
import type { HistoryFilters as HistoryFilterValues } from "@/types/HistoryTypes";
import FileStatusItem from "./FileStatusItem";
import HistoryFilters from "./HistoryFilters";

type ServerEntrySnapshot = {
  entry: HistoryEntry;
  fetchedAt: number;
};

function mergeLiveProgress(
  serverEntries: ServerEntrySnapshot[],
  liveEntries: HistoryEntry[],
): HistoryEntry[] {
  const liveById = new Map(liveEntries.map((entry) => [entry.file_id, entry]));

  return serverEntries.map(({ entry: serverEntry, fetchedAt }) => {
    const liveEntry = liveById.get(serverEntry.file_id);
    const liveTimestamp = liveEntry ? Date.parse(liveEntry.timestamp) : NaN;

    return liveEntry && Number.isFinite(liveTimestamp) && liveTimestamp > fetchedAt
      ? { ...serverEntry, ...liveEntry }
      : serverEntry;
  });
}

export default function HistorySection() {
  const [filters, setFilters] = useState<HistoryFilterValues>(
    DEFAULT_HISTORY_FILTERS,
  );
  const [pageFetchFailed, setPageFetchFailed] = useState(false);
  const query = useHistoryList(filters);
  const liveEntries = useHistory((state) => state.entries);
  const cancellations = useHistory((state) => state.cancellations);
  const workspaces = useGlobalContext((state) => state.workspaces);

  const serverEntries = useMemo(() => {
    const seen = new Set<string>();
    const entries: ServerEntrySnapshot[] = [];

    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.document_id)) continue;
        seen.add(item.document_id);
        entries.push({ entry: mapHistoryItem(item), fetchedAt: page.fetchedAt });
      }
    }

    return entries;
  }, [query.data?.pages]);

  const entries = useMemo(
    () => mergeLiveProgress(serverEntries, liveEntries).filter((entry) => {
      const cancellation = cancellations[entry.file_id];
      const cancellationIsPending =
        entry.status === FILE_STATUS.CANCELLING &&
        entry.error === null &&
        cancellation?.phase !== "failed";
      return !cancellationIsPending &&
        cancellation?.phase !== "pending" &&
        cancellation?.phase !== "removed";
    }),
    [serverEntries, liveEntries, cancellations],
  );

  useEffect(() => {
    if (!query.data || serverEntries.length === 0) return;
    useHistory.getState().syncServerEntries(serverEntries);
  }, [query.data, serverEntries]);

  useEffect(() => {
    setPageFetchFailed(false);
  }, [filters.status, filters.workspaceId, filters.sort]);

  useEffect(() => {
    if (
      filters.workspaceId &&
      !workspaces.some((workspace) => workspace.id === filters.workspaceId)
    ) {
      setFilters((current) => ({ ...current, workspaceId: null }));
    }
  }, [filters.workspaceId, workspaces]);

  async function loadOlderFiles() {
    setPageFetchFailed(false);
    try {
      const result = await query.fetchNextPage();
      setPageFetchFailed(result.isError);
    } catch {
      setPageFetchFailed(true);
    }
  }

  const errorMessage = query.error
    ? extractApiErrorMessage(query.error, HISTORY_LOAD_ERROR)
    : HISTORY_LOAD_ERROR;
  const olderPageErrorMessage = query.error
    ? extractApiErrorMessage(query.error, "Unable to load older files.")
    : "Unable to load older files.";

  return (
    <div className="flex w-full flex-col gap-2 px-4 pt-6">
      <h1 className="mb-2 text-3xl font-bold">File Upload History &amp; Status</h1>
      <HistoryFilters filters={filters} onFiltersChange={setFilters} />

      {query.isLoading && (
        <div className="space-y-2" aria-label="Loading file history">
          {Array.from({ length: HISTORY_SKELETON_COUNT }, (_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded border bg-muted"
            />
          ))}
        </div>
      )}

      {query.isError && !pageFetchFailed && !query.isFetching && (
        <div className="flex flex-wrap items-center gap-3 rounded border border-destructive/40 p-3 text-sm" role="alert">
          <span>{errorMessage}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {query.data && entries.length === 0 && !query.isFetching && !query.error && (
        <p>No files found.</p>
      )}

      {entries.map((entry) => (
        <FileStatusItem key={entry.file_id} {...entry} />
      ))}

      {pageFetchFailed && (
        <div className="flex flex-wrap items-center gap-3 text-sm" role="alert">
          <span>{olderPageErrorMessage}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => void loadOlderFiles()}
          >
            Retry loading older files
          </Button>
        </div>
      )}

      {query.hasNextPage && !pageFetchFailed && (
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void loadOlderFiles()}
        >
          {query.isFetchingNextPage ? "Loading…" : "Load older files"}
        </Button>
      )}
    </div>
  );
}
