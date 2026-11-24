import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiRag from '@/lib/axios';
import { WORKSPACE_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiWorkspaceTreeResponse } from '@/types/WorkspaceTypes';
import { useHistory } from '@/context/HistoryContext';
import type { HistoryEntry } from '@/types/FileTypes';
import FileStatusItem from './FileStatusItem';

export default function HistorySection() {
  const entries = useHistory((s) => s.entries);
  const setEntries = useHistory.setState;
  const tree = useQuery({
    queryKey: ['workspaces', 'tree'],
    queryFn: async () =>
      (await apiRag.get<ApiWorkspaceTreeResponse>(WORKSPACE_ENDPOINTS.tree))
        .data,
    staleTime: 30_000,
    cacheTime: 10 * 60_000,
  });

  useEffect(() => {
    if (!tree.data) return;
    const current = new Map(
      useHistory.getState().entries.map((entry) => [entry.file_id, entry]),
    );
    const serverEntries: HistoryEntry[] = tree.data.workspaces.flatMap(
      (workspace) =>
        workspace.files
          .map((file) => {
            const previous = current.get(file.id);
            return {
              file_id: file.id,
              originalFilename: file.name,
              workspaceName: workspace.name,
              message: previous?.message ?? null,
              status:
                previous?.status ?? (file.status as HistoryEntry['status']),
              timestamp: previous?.timestamp ?? file.created_at,
              step: previous?.step ?? null,
              stage: previous?.stage ?? null,
              pageNumber: previous?.pageNumber ?? null,
              totalPages: previous?.totalPages ?? file.page_count,
              stepTotal: previous?.stepTotal ?? null,
              error: previous?.error ?? null,
            };
          })
          .filter((entry) => entry.file_id),
    );
    setEntries({ entries: serverEntries });
    window.localStorage.removeItem('rag-history');
  }, [tree.data, setEntries]);

  return (
    <div className="flex w-full flex-col gap-2 px-4 pt-6">
      <h1 className="text-3xl font-bold mb-2">File Upload History & Status</h1>
      {tree.isLoading && (
        <div className="space-y-2" aria-label="Loading file history">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded border bg-muted"
            />
          ))}
        </div>
      )}
      {!!tree.error && <p role="alert">Unable to load file history.</p>}
      {tree.data && entries.length === 0 && <p>No files found.</p>}
      {entries.map((entry) => (
        <FileStatusItem key={entry.file_id} {...entry} />
      ))}
    </div>
  );
}
