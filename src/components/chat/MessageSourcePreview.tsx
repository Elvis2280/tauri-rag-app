import { useEffect, useRef, useState } from "react";
import { BookOpen, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarkdownViewerDialog, {
  type LoadedMarkdown,
} from "@/components/workspace/MarkdownViewerDialog";
import { useDocumentMarkdown } from "@/hooks/useDocumentMarkdown";

type MessageSourcePreviewProps = {
  englishSourceId?: string;
  japaneseSourceId?: string;
};

export default function MessageSourcePreview({
  englishSourceId,
  japaneseSourceId,
}: MessageSourcePreviewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestedName, setRequestedName] = useState<string | null>(null);
  const [loadedMarkdown, setLoadedMarkdown] = useState<LoadedMarkdown | null>(
    null,
  );
  const [isMarkdownLoading, setIsMarkdownLoading] = useState(false);
  const [hasMarkdownLoadError, setHasMarkdownLoadError] = useState(false);
  const requestSequence = useRef(0);
  const { loadMarkdown } = useDocumentMarkdown();

  useEffect(
    () => () => {
      requestSequence.current += 1;
    },
    [],
  );

  const handleOpenSource = (fileId: string, name: string) => {
    const markdownId = fileId.trim();
    if (!markdownId) return;

    const currentRequest = requestSequence.current + 1;
    requestSequence.current = currentRequest;
    setRequestedName(name);
    setLoadedMarkdown(null);
    setHasMarkdownLoadError(false);
    setIsMarkdownLoading(true);
    setIsDialogOpen(true);

    void loadMarkdown(markdownId)
      .then((content) => {
        if (requestSequence.current !== currentRequest) return;

        setLoadedMarkdown({
          fileId: markdownId,
          name,
          content,
        });
      })
      .catch(() => {
        if (requestSequence.current === currentRequest) {
          setHasMarkdownLoadError(true);
        }
      })
      .finally(() => {
        if (requestSequence.current === currentRequest) {
          setIsMarkdownLoading(false);
        }
      });
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      requestSequence.current += 1;
      setIsMarkdownLoading(false);
    }

    setIsDialogOpen(open);
  };

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-current/15 pt-3">
        {englishSourceId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Preview English source page"
            className="h-8 gap-2 rounded-full border-current/20 bg-background/50 px-3 text-xs"
            onClick={() => handleOpenSource(englishSourceId, "English source")}
          >
            <BookOpen aria-hidden="true" className="size-3.5" />
            English source
          </Button>
        )}
        {japaneseSourceId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="日本語の原文ページをプレビュー"
            className="h-8 gap-2 rounded-full border-current/20 bg-background/50 px-3 text-xs"
            onClick={() => handleOpenSource(japaneseSourceId, "日本語の原文")}
          >
            <Languages aria-hidden="true" className="size-3.5" />
            日本語の原文
          </Button>
        )}
      </div>
      <MarkdownViewerDialog
        open={isDialogOpen}
        requestedName={requestedName}
        markdown={loadedMarkdown}
        isLoading={isMarkdownLoading}
        hasLoadError={hasMarkdownLoadError}
        onOpenChange={handleDialogOpenChange}
      />
    </>
  );
}
