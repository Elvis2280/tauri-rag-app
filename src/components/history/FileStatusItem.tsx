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

export default function FileStatusItem({
  file_id,
  message,
  status,
  step,
  stage,
  pageNumber,
  totalPages,
}: FileStatusItemProps) {
  const subtitle = [
    step || stage ? [step, stage].filter(Boolean).join(" · ") : null,
    pageNumber != null && totalPages != null
      ? `page ${pageNumber} / ${totalPages}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle title={file_id}>{file_id}</ItemTitle>
        <p className="text-xs text-muted-foreground truncate">
          {subtitle || message || status}
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
