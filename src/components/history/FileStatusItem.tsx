import { type statusFileType, FILE_STATUS } from "@/types/FileTypes";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item";
import { cn } from "@/lib/utils";

type FileStatusItemProps = {
  file_id: string;
  message: string;
  status: statusFileType;
};

function getStatusColor(status: statusFileType): string {
  if (status === FILE_STATUS.COMPLETED) return "bg-green-500";
  if (status === FILE_STATUS.FAILED) return "bg-red-500";
  return "bg-yellow-500";
}

export default function FileStatusItem({
  file_id,
  message,
  status,
}: FileStatusItemProps) {
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle title={file_id}>{file_id}</ItemTitle>
      </ItemContent>
      <span className="flex-1 min-w-0 truncate text-sm text-muted-foreground">
        {message || status}
      </span>
      <ItemActions>
        <span
          className={cn("h-2 w-2 rounded-full", getStatusColor(status))}
        />
      </ItemActions>
    </Item>
  );
}
