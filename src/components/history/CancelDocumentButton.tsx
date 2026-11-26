import { useState } from "react";
import { CircleStop } from "lucide-react";
import { useCancelDocument } from "@/hooks/useDocument";
import { HISTORY_CANCELLATION_MESSAGES } from "@/constants/history";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CancelDocumentButtonProps = {
  documentId: string;
  filename: string | null;
};

export default function CancelDocumentButton({
  documentId,
  filename,
}: CancelDocumentButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { cancelDocument, isPending, pendingDocumentId } = useCancelDocument();
  const isSubmitting = isPending && pendingDocumentId === documentId;

  async function handleConfirm() {
    const accepted = await cancelDocument(documentId);
    if (accepted) setIsDialogOpen(false);
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Cancel this process"
              disabled={isSubmitting}
              onClick={() => setIsDialogOpen(true)}
            >
              <CircleStop aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cancel this process</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setIsDialogOpen(open);
        }}
      >
        <DialogContent
          className="rounded"
          showCloseButton={!isSubmitting}
          onEscapeKeyDown={(event) => {
            if (isSubmitting) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (isSubmitting) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{HISTORY_CANCELLATION_MESSAGES.confirmTitle}</DialogTitle>
            <DialogDescription>
              {HISTORY_CANCELLATION_MESSAGES.confirmDescription}
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm font-medium text-foreground">
            File: <span className="font-normal">{filename || "Unknown file"}</span>
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsDialogOpen(false)}
            >
              Keep processing
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => void handleConfirm()}
            >
              {isSubmitting ? "Cancelling…" : HISTORY_CANCELLATION_MESSAGES.confirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
