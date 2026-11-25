import { X } from "lucide-react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { Button } from "@/components/ui/button";
import { useFileContext } from "@/context/FileContext";
import type { FileUploadType } from "@/types/FileTypes";

type UploadModalFileItemProps = {
  file: FileUploadType;
  errorMessage?: string;
  disabled?: boolean;
};

function formatBytesToMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadModalFileItem({ file, errorMessage, disabled = false }: UploadModalFileItemProps) {
  const removeFile = useFileContext((state) => state.removeFile);

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle className="normal-case">{file.file.name}</ItemTitle>
        <p className="text-xs text-muted-foreground">
          {formatBytesToMB(file.file.size)}
        </p>
      </ItemContent>
      <ItemActions>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${file.file.name}`}
          type="button"
          disabled={disabled}
          onClick={() => removeFile(file.id)}
        >
          <X />
        </Button>
      </ItemActions>
      {errorMessage && <p role="alert" className="basis-full text-xs text-destructive">{errorMessage}</p>}
    </Item>
  );
}
