import { X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MARKDOWN_LABELS, MARKDOWN_MESSAGES } from "@/constants/markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

export type LoadedMarkdown = {
  fileId: string;
  name: string;
  content: string;
};

type MarkdownViewerDialogProps = {
  open: boolean;
  requestedName: string | null;
  markdown: LoadedMarkdown | null;
  isLoading: boolean;
  hasLoadError: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function MarkdownViewerDialog({
  open,
  requestedName,
  markdown,
  isLoading,
  hasLoadError,
  onOpenChange,
}: MarkdownViewerDialogProps) {
  const showEmptyError = !markdown && hasLoadError && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[90vh] w-[94vw] max-w-[94vw] grid-rows-[auto_minmax(0,1fr)] gap-3 p-4 sm:max-w-[94vw]"
      >
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={MARKDOWN_LABELS.closePreview}
            className="absolute top-4 right-4 z-10 shadow-lg ring-2 ring-border"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        <DialogHeader className="pr-12">
          <DialogTitle className="truncate normal-case tracking-normal">
            {markdown?.name ?? requestedName ?? "Markdown preview"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview the selected Markdown document.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-auto rounded border bg-muted/30 p-5 sm:p-8">
          {markdown ? (
            <article className="markdown-viewer-content mx-auto max-w-4xl">
              <Markdown remarkPlugins={[remarkGfm]}>{markdown.content}</Markdown>
            </article>
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center text-muted-foreground">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  {MARKDOWN_MESSAGES.loading}
                </div>
              ) : showEmptyError ? (
                <p role="alert" className="text-destructive">
                  {MARKDOWN_MESSAGES.unavailable}
                </p>
              ) : null}
            </div>
          )}

          {isLoading && markdown ? (
            <div
              role="status"
              className="sticky bottom-3 mx-auto mt-3 flex w-fit items-center gap-2 rounded bg-popover px-4 py-2 shadow ring-1 ring-border"
            >
              <Spinner />
              {MARKDOWN_MESSAGES.loading}
            </div>
          ) : null}
          {hasLoadError && markdown && !isLoading ? (
            <p role="alert" className="mt-4 text-center text-sm text-destructive">
              {MARKDOWN_MESSAGES.unavailable}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
