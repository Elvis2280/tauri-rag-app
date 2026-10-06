import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ItemGroup } from "@/components/ui/item";
import type { FileUploadType } from "@/types/FileTypes";
import UploadModalFileItem from "./UploadModalFileItem";
import UploadWorkspaceSelect from "./UploadWorkspaceSelect";
import DuplicateFileWarningDialog from "./DuplicateFileWarningDialog";

type WorkspaceOption = {
  id: string;
  name: string;
};

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
  files: FileUploadType[];
  workspaceId: string;
  onWorkspaceChange: (value: string) => void;
  onWorkspaceBlur: () => void;
  workspaceError?: string;
  canUpload: boolean;
  workspaces: WorkspaceOption[];
  workspacesLoading?: boolean;
  workspacesError?: string | null;
  workspaceTreeLoading?: boolean;
  workspaceTreeError?: string | null;
  onRetryWorkspaceTree?: () => void;
  duplicateFileNames: string[];
  duplicateWorkspaceName: string;
  onUploadAnyway: () => void;
  onCancelDuplicateUpload: () => void;
};

export default function UploadModal({
  isOpen,
  onClose,
  onUpload,
  files,
  workspaceId,
  onWorkspaceChange,
  onWorkspaceBlur,
  workspaceError,
  canUpload,
  workspaces,
  workspacesLoading,
  workspacesError,
  workspaceTreeLoading,
  workspaceTreeError,
  onRetryWorkspaceTree,
  duplicateFileNames,
  duplicateWorkspaceName,
  onUploadAnyway,
  onCancelDuplicateUpload,
}: UploadModalProps) {
  const workspaceLoadError = workspacesError ?? workspaceTreeError;
  const hasDuplicateFiles = duplicateFileNames.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded">
        {hasDuplicateFiles ? (
          <DuplicateFileWarningDialog
            workspaceName={duplicateWorkspaceName}
            fileNames={duplicateFileNames}
            onAccept={onUploadAnyway}
            onCancel={onCancelDuplicateUpload}
          />
        ) : (
          <DialogForm
            onSubmit={(event) => {
              event.preventDefault();
              onUpload();
            }}
          >
            <DialogHeader>
              <DialogTitle>Files to upload</DialogTitle>
              <DialogDescription>
                Select a workspace and confirm the files to upload.
              </DialogDescription>
            </DialogHeader>
            <UploadWorkspaceSelect
              value={workspaceId}
              onValueChange={onWorkspaceChange}
              onBlur={onWorkspaceBlur}
              error={workspaceError}
              workspaces={workspaces}
              isLoading={workspacesLoading || workspaceTreeLoading}
              loadError={workspaceLoadError}
              onRetry={workspaceTreeError ? onRetryWorkspaceTree : undefined}
            />
            <ItemGroup className="max-h-60 overflow-y-auto flex flex-col gap-2">
              {files.map((file) => (
                <UploadModalFileItem key={file.id} file={file} />
              ))}
            </ItemGroup>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="outline" disabled={!canUpload}>
                Upload
              </Button>
            </DialogFooter>
          </DialogForm>
        )}
      </DialogContent>
    </Dialog>
  );
}
