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
  if (status === FILE_STATUS.COMPLETED) return "bg-success/15";
  if (status === FILE_STATUS.FAILED) return "bg-destructive/15";
  return "";
}

export default function FileStatusItem({
  file_id,
  message,
  status,
  step,
  stage,
  pageNumber,
  totalPages,
}: FileStatusItemProps) {
  const stepStage =
    step || stage ? [step, stage].filter(Boolean).join(" · ") : null;
  const messagePart = message != null ? message : null;
  const pagePart =
    pageNumber != null && totalPages != null
      ? `page ${pageNumber} / ${totalPages}`
      : null;
  const subtitle = [stepStage, messagePart, pagePart]
    .filter(Boolean)
    .join(" · ");

  return (
    <Item variant="outline" size="sm" className={getCardTint(status)}>
      <ItemContent className="cursor-default overflow-hidden">
        <ItemTitle title={file_id}>{file_id}</ItemTitle>
        <p className="text-xs text-muted-foreground truncate">
          {subtitle || status}
        </p>
      </ItemContent>
      <ItemActions>
        <span
          className={cn("h-2 w-2 rounded-full", getStatusColor(status))}
        />
      </ItemActions>
    </Item>
  );
}
