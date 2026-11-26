import { type statusFileType, FILE_STATUS } from '@/types/FileTypes';
import type { HistoryEntry } from '@/types/FileTypes';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/components/ui/item';
import { Badge } from '@/components/ui/badge';
import {
  HISTORY_RETRY_MESSAGES,
  MISSING_PAGE_LABEL,
  UNKNOWN_FILE_LABEL,
  UNKNOWN_WORKSPACE_LABEL,
} from '@/constants/history';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { RotateCw } from 'lucide-react';
import CancelDocumentButton from '@/components/history/CancelDocumentButton';
import { useRetryDocument } from '@/hooks/useDocument';
import { memo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import apiRag from '@/lib/axios';
import { DOCUMENT_ENDPOINTS } from '@/lib/api/endpoints';
import { ChevronDown, ChevronUp } from 'lucide-react';

type DocumentHistoryResponse = {
  events: Array<{ id: string; status: string; stage: string | null; step: string | null; message: string | null; page_number: number | null; total_pages: number | null; created_at: string }>;
  next_cursor: string | null;
};

function HistoryEvents({ fileId }: { fileId: string }) {
  const history = useInfiniteQuery({
    queryKey: ['documents', fileId, 'history'],
    queryFn: async ({ pageParam }) => (await apiRag.get<DocumentHistoryResponse>(DOCUMENT_ENDPOINTS.history(fileId, pageParam))).data,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    staleTime: 30_000,
    cacheTime: 10 * 60_000,
  });

  return <div className="relative z-10 w-full border-t px-3 py-2 text-xs">
    {history.isLoading && <p>Loading saved events…</p>}
    {!!history.error && <p role="alert">Unable to load saved events.</p>}
    {history.data?.pages.flatMap((page) => page.events).map((event) => <p key={event.id}>{new Date(event.created_at).toLocaleString()} · {event.status} · {event.stage ?? '—'} · {event.step ?? '—'} · {event.message ?? '—'} · Page {event.page_number ?? '—'} / {event.total_pages ?? '—'}</p>)}
    {history.hasNextPage && <Button type="button" variant="link" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{history.isFetchingNextPage ? 'Loading…' : 'Load older events'}</Button>}
  </div>;
}

type FileStatusItemProps = HistoryEntry;

function getStatusColor(status: statusFileType): string {
  if (status === FILE_STATUS.COMPLETED) return 'bg-green-500';
  if (status === FILE_STATUS.FAILED) return 'bg-red-500';
  return 'bg-yellow-500';
}

function getRetryMessage(
  status: statusFileType,
  message: string | null,
  isSubmitting: boolean,
): string | null {
  if (status === FILE_STATUS.RETRY_QUEUED) {
    return message || HISTORY_RETRY_MESSAGES.queued;
  }
  if (status === FILE_STATUS.RETRY_RUNNING) {
    return message || HISTORY_RETRY_MESSAGES.running;
  }
  return isSubmitting && status === FILE_STATUS.FAILED
    ? HISTORY_RETRY_MESSAGES.pending
    : null;
}

function getProgressPercentage(
  step: number | null | undefined,
  stepTotal: number | null | undefined,
): number | null {
  if (
    step == null ||
    stepTotal == null ||
    !Number.isFinite(step) ||
    !Number.isFinite(stepTotal) ||
    stepTotal <= 0
  ) {
    return null;
  }

  return Math.min(100, Math.max(0, (step / stepTotal) * 100));
}

function FileStatusItem({
  file_id,
  message,
  originalFilename,
  workspaceName,
  status,
  step,
  pageNumber,
  totalPages,
  stepTotal,
}: FileStatusItemProps) {
  const { retryDocument, isPending, pendingDocumentId } = useRetryDocument();
  const isSubmitting = isPending && pendingDocumentId === file_id;
  const retryMessage = getRetryMessage(status, message, isSubmitting);
  const isFailed = status === FILE_STATUS.FAILED;
  const indicatorStatus = isFailed && isSubmitting ? FILE_STATUS.RETRY_QUEUED : status;
  const [historyOpen, setHistoryOpen] = useState(false);
  const subtitle = `Page: ${status === FILE_STATUS.COMPLETED ? totalPages : (pageNumber ?? MISSING_PAGE_LABEL)} / ${totalPages ?? MISSING_PAGE_LABEL} · ${message ?? MISSING_PAGE_LABEL} · Status: ${status}`;

  const progress = getProgressPercentage(step, stepTotal);
  const showProgress = progress !== null && !isFailed;

  return (
    <Item
      variant="outline"
      size="sm"
      className={cn(
        'relative overflow-hidden rounded',
        isFailed && !isSubmitting && 'bg-destructive/15',
      )}
    >
      {showProgress && (
        <div
          aria-label="File processing progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          aria-valuetext={`${Math.round(progress)}% complete`}
          className="pointer-events-none absolute inset-y-0 left-0 z-0 bg-primary/10 transition-[width] duration-300 ease-out"
          role="progressbar"
          style={{ width: `${progress}%` }}
        />
      )}
      <ItemContent className="relative z-10 min-w-0 cursor-default overflow-hidden">
        <div
          className="flex min-w-0 flex-col items-start gap-1"
          title={file_id}
        >
          <Badge variant="secondary" className="max-w-full truncate">
            Workspace: {workspaceName ?? UNKNOWN_WORKSPACE_LABEL}
          </Badge>
          <ItemTitle className="w-full min-w-0">
            <span className="block max-w-full truncate">
              {originalFilename ?? UNKNOWN_FILE_LABEL}
            </span>
          </ItemTitle>
        </div>
        {!retryMessage && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </ItemContent>
      {retryMessage && (
        <p
          role="status"
          className="relative z-10 min-w-0 flex-2 wrap-anywhere text-center text-xs text-muted-foreground"
        >
          {retryMessage}
        </p>
      )}
      <ItemActions className="relative z-10 shrink-0">
        <Button type="button" size="icon" variant="ghost" aria-label="Toggle file processing history" onClick={() => setHistoryOpen((open) => !open)}>
          {historyOpen ? <ChevronUp /> : <ChevronDown />}
        </Button>
        {isFailed && (
          <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" size="icon" variant="ghost" aria-label="Retry this file process" disabled={isSubmitting} onClick={() => void retryDocument(file_id)}>
                <RotateCw aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Retry this file process</TooltipContent>
          </Tooltip>
          </TooltipProvider>
        )}
        {status !== FILE_STATUS.COMPLETED &&
          status !== FILE_STATUS.FAILED &&
          status !== FILE_STATUS.CANCELLING &&
          status !== FILE_STATUS.CANCELLED && (
            <CancelDocumentButton documentId={file_id} filename={originalFilename} />
          )}
        <span className={cn('h-2 w-2 rounded-full', getStatusColor(indicatorStatus))} />
      </ItemActions>
      {historyOpen && <HistoryEvents fileId={file_id} />}
    </Item>
  );
}

export default memo(FileStatusItem);
