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
  MISSING_PAGE_LABEL,
  UNKNOWN_FILE_LABEL,
  UNKNOWN_WORKSPACE_LABEL,
} from '@/constants/history';
import { cn } from '@/lib/utils';

type FileStatusItemProps = HistoryEntry;

function getStatusColor(status: statusFileType): string {
  if (status === FILE_STATUS.COMPLETED) return 'bg-green-500';
  if (status === FILE_STATUS.FAILED) return 'bg-red-500';
  return 'bg-yellow-500';
}

function getCardTint(status: statusFileType): string {
  if (status === FILE_STATUS.FAILED) return 'bg-destructive/15';
  return '';
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

export default function FileStatusItem({
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
  const subtitle = `Page: ${status === FILE_STATUS.COMPLETED ? totalPages : (pageNumber ?? MISSING_PAGE_LABEL)} / ${totalPages ?? MISSING_PAGE_LABEL} · ${message ?? MISSING_PAGE_LABEL} · Status: ${status}`;

  const progress = getProgressPercentage(step, stepTotal);
  const showProgress = progress !== null && status !== FILE_STATUS.FAILED;

  return (
    <Item
      variant="outline"
      size="sm"
      className={cn('relative overflow-hidden rounded', getCardTint(status))}
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
      <ItemContent className="relative z-10 cursor-default overflow-hidden">
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
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </ItemContent>
      <ItemActions className="relative z-10">
        <span className={cn('h-2 w-2 rounded-full', getStatusColor(status))} />
      </ItemActions>
    </Item>
  );
}
