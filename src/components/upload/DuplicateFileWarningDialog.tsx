import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DUPLICATE_UPLOAD_ACCEPT_LABEL,
  DUPLICATE_UPLOAD_CANCEL_LABEL,
  DUPLICATE_UPLOAD_DESCRIPTION,
  DUPLICATE_UPLOAD_TITLE,
} from "@/constants/upload";
import type { DuplicateUploadMatch } from "@/lib/upload";
import type { FileUploadType } from "@/types/FileTypes";

type DuplicateFileWarningDialogProps = {
  workspaceName: string;
  matches: DuplicateUploadMatch[];
  selectedTargets: Record<string, string>;
  fileErrors: Record<string, string>;
  files: FileUploadType[];
  conflictingTargets: Set<string>;
  isSubmitting: boolean;
  canConfirm: boolean;
  onTargetChange: (fileId: string, documentId: string) => void;
  onAccept: () => void;
  onCancel: () => void;
};

export default function DuplicateFileWarningDialog({
  workspaceName,
  matches,
  selectedTargets,
  fileErrors,
  files,
  conflictingTargets,
  isSubmitting,
  canConfirm,
  onTargetChange,
  onAccept,
  onCancel,
}: DuplicateFileWarningDialogProps) {
  return (
    <div role="alertdialog" aria-label={DUPLICATE_UPLOAD_TITLE} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <DialogTitle>{DUPLICATE_UPLOAD_TITLE}</DialogTitle>
        <DialogDescription>{DUPLICATE_UPLOAD_DESCRIPTION}</DialogDescription>
      </div>
      <p className="text-sm font-medium text-foreground">
        Workspace: <span className="font-normal">{workspaceName}</span>
      </p>
      <ul className="max-h-60 list-disc overflow-y-auto pl-5 text-sm text-foreground">
        {matches.map((match) => (
          <li key={match.fileId} className="mb-3">
            <p>{match.fileName}</p>
            <p className="text-xs text-muted-foreground">Replace existing file:</p>
            {match.candidates.length === 1 ? (
              <p>{match.candidates[0].name}</p>
            ) : (
              <Select
                value={selectedTargets[match.fileId] ?? ""}
                onValueChange={(documentId) => onTargetChange(match.fileId, documentId)}
                disabled={isSubmitting}
              >
                <SelectTrigger aria-label={`Choose file to replace for ${match.fileName}`}>
                  <SelectValue placeholder="Choose the existing file" />
                </SelectTrigger>
                <SelectContent>
                  {match.candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedTargets[match.fileId] && conflictingTargets.has(selectedTargets[match.fileId]) && (
              <p role="alert" className="text-xs text-destructive">
                Each upload must replace a different existing file.
              </p>
            )}
          </li>
        ))}
      </ul>
      {files.some(({ id }) => fileErrors[id]) && (
        <ul className="max-h-24 overflow-y-auto text-xs text-destructive">
          {files.filter(({ id }) => fileErrors[id]).map((file) => (
            <li role="alert" key={file.id}>{file.file.name}: {fileErrors[file.id]}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          {DUPLICATE_UPLOAD_CANCEL_LABEL}
        </Button>
        <Button type="button" variant="outline" onClick={onAccept} disabled={!canConfirm || isSubmitting}>
          {isSubmitting ? "Processing…" : DUPLICATE_UPLOAD_ACCEPT_LABEL}
        </Button>
      </div>
    </div>
  );
}
