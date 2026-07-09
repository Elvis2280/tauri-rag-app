import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ItemGroup } from "@/components/ui/item";
import type { FileUploadType } from "@/types/FileTypes";
import UploadModalFileItem from "./UploadModalFileItem";
import UploadWorkspaceSelect from "./UploadWorkspaceSelect";

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
}: UploadModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded">
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
          isLoading={workspacesLoading}
          loadError={workspacesError}
        />
        <ItemGroup className="max-h-60 overflow-y-auto flex flex-col gap-2">
          {files.map((file) => (
            <UploadModalFileItem key={file.id} file={file} />
          ))}
        </ItemGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onUpload} disabled={!canUpload}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
