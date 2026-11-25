import { useEffect, useRef, useState } from "react";
import { BookOpen, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarkdownViewerDialog, {
  type LoadedMarkdown,
} from "@/components/workspace/MarkdownViewerDialog";
import { useDocumentMarkdown } from "@/hooks/useDocumentMarkdown";
import type { ChatMessage } from "@/types/ChatTypes";

type MessageSourcePreviewProps = {
  englishSourceId?: string;
  japaneseSourceId?: string;
  sources?: ChatMessage["sources"];
};

type SourcePreviewItem = {
  id: string;
  language: "english" | "japanese";
  pageNumber?: number;
};

export default function MessageSourcePreview({
  englishSourceId,
  japaneseSourceId,
  sources,
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
  const sourceItems: SourcePreviewItem[] = sources?.some(
    (source) => source.englishMarkdownId || source.japaneseMarkdownId,
  )
    ? sources.flatMap((source) => [
          {
            id: source.englishMarkdownId,
            language: "english" as const,
            pageNumber: source.pageNumber,
          },
          {
            id: source.japaneseMarkdownId,
            language: "japanese" as const,
            pageNumber: source.pageNumber,
          },
        ]).filter((source) => Boolean(source.id))
    : [
        ...(englishSourceId ? [{ id: englishSourceId, language: "english" as const }] : []),
        ...(japaneseSourceId ? [{ id: japaneseSourceId, language: "japanese" as const }] : []),
      ];

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
        {sourceItems.map((source, index) => {
          const isEnglish = source.language === "english";
          const label = isEnglish ? "English source" : "日本語の原文";
          const pageLabel = source.pageNumber ? ` · p. ${source.pageNumber}` : "";
          const ariaLabel = source.pageNumber
            ? isEnglish
              ? `Preview English source page ${source.pageNumber}`
              : `日本語の原文ページ ${source.pageNumber} をプレビュー`
            : isEnglish
              ? "Preview English source page"
              : "日本語の原文ページをプレビュー";

          return (
            <Button
              key={`${source.id}-${source.language}-${source.pageNumber ?? "all"}-${index}`}
              type="button"
              size="sm"
              variant="outline"
              aria-label={ariaLabel}
              className="h-8 gap-2 rounded-full border-current/20 bg-background/50 px-3 text-xs"
              onClick={() => handleOpenSource(source.id, `${label}${pageLabel}`)}
            >
              {isEnglish ? (
                <BookOpen aria-hidden="true" className="size-3.5" />
              ) : (
                <Languages aria-hidden="true" className="size-3.5" />
              )}
              {label}
              {pageLabel}
            </Button>
          );
        })}
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
