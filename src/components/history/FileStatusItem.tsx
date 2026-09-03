import { type statusFileType, FILE_STATUS } from "@/types/FileTypes";
import type { HistoryEntry } from "@/types/FileTypes";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item";
import { cn } from "@/lib/utils";

type FileStatusItemProps = HistoryEntry;

function getStatusColor(status: statusFileType): string {
  if (status === FILE_STATUS.COMPLETED) return "bg-green-500";
  if (status === FILE_STATUS.FAILED) return "bg-red-500";
  return "bg-yellow-500";
}

function getCardTint(status: statusFileType): string {
  if (status === FILE_STATUS.FAILED) return "bg-destructive/15";
  return "";
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
  status,
  step,
  pageNumber,
  totalPages,
  stepTotal,
}: FileStatusItemProps) {
  const stepStage =
    step != null && stepTotal != null ? `${step} / ${stepTotal}` : null;
  const messagePart = message != null ? message : null;
  const pagePart =
    pageNumber != null && totalPages != null
      ? `page ${pageNumber} / ${totalPages}`
      : null;
  const subtitle = [stepStage, messagePart, pagePart]
    .filter(Boolean)
    .join(" · ");

  const progress = getProgressPercentage(step, stepTotal);
  const showProgress = progress !== null && status !== FILE_STATUS.FAILED;

  return (
    <Item
      variant="outline"
      size="sm"
      className={cn("relative overflow-hidden rounded", getCardTint(status))}
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
        <ItemTitle title={file_id}>{file_id}</ItemTitle>
        <p className="text-xs text-muted-foreground truncate">
          {subtitle || status}
        </p>
      </ItemContent>
      <ItemActions className="relative z-10">
        <span
          className={cn("h-2 w-2 rounded-full", getStatusColor(status))}
        />
      </ItemActions>
    </Item>
  );
}
