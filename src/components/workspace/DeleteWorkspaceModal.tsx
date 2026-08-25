import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DeleteWorkspaceModalProps = {
  isOpen: boolean;
  workspaceName: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
};

export default function DeleteWorkspaceModal({
  isOpen,
  workspaceName,
  onClose,
  onConfirm,
  isPending,
}: DeleteWorkspaceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded">
        <DialogHeader>
          <DialogTitle>Delete this workspace?</DialogTitle>
          <DialogDescription>
            You&apos;ll permanently lose access to this workspace, including its
            files and stored memory. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm font-medium text-foreground">
          Workspace: <span className="font-normal">{workspaceName}</span>
        </p>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Disabling…" : "Delete workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
