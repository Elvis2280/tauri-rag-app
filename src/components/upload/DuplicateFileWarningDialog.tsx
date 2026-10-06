import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DUPLICATE_UPLOAD_ACCEPT_LABEL,
  DUPLICATE_UPLOAD_CANCEL_LABEL,
  DUPLICATE_UPLOAD_DESCRIPTION,
  DUPLICATE_UPLOAD_TITLE,
} from "@/constants/upload";

type DuplicateFileWarningDialogProps = {
  workspaceName: string;
  fileNames: string[];
  onAccept: () => void;
  onCancel: () => void;
};

export default function DuplicateFileWarningDialog({
  workspaceName,
  fileNames,
  onAccept,
  onCancel,
}: DuplicateFileWarningDialogProps) {
  return (
    <div
      role="alertdialog"
      aria-label={DUPLICATE_UPLOAD_TITLE}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <DialogTitle>
          {DUPLICATE_UPLOAD_TITLE}
        </DialogTitle>
        <DialogDescription>
          {DUPLICATE_UPLOAD_DESCRIPTION}
        </DialogDescription>
      </div>
      <p className="text-sm font-medium text-foreground">
        Workspace: <span className="font-normal">{workspaceName}</span>
      </p>
      <ul className="max-h-40 list-disc overflow-y-auto pl-5 text-sm text-foreground">
        {fileNames.map((fileName) => (
          <li key={fileName}>{fileName}</li>
        ))}
      </ul>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {DUPLICATE_UPLOAD_CANCEL_LABEL}
        </Button>
        <Button type="button" variant="outline" onClick={onAccept}>
          {DUPLICATE_UPLOAD_ACCEPT_LABEL}
        </Button>
      </div>
    </div>
  );
}
