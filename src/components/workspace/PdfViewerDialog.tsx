import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { toast } from "sonner";
import {
  DOCUMENT_LABELS,
  DOCUMENT_MESSAGES,
  PDF_VIEWER_DEFAULT_PAGE_WIDTH,
  PDF_VIEWER_DEFAULT_ZOOM,
  PDF_VIEWER_MAX_PAGE_WIDTH,
  PDF_VIEWER_MAX_ZOOM,
  PDF_VIEWER_MIN_PAGE_WIDTH,
  PDF_VIEWER_MIN_ZOOM,
  PDF_VIEWER_PAGE_HORIZONTAL_PADDING,
  PDF_VIEWER_ZOOM_STEP,
} from "@/constants/document";
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

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type LoadedPdf = {
  documentId: string;
  name: string;
  data: Uint8Array;
};

type PdfViewerDialogProps = {
  open: boolean;
  requestedName: string | null;
  pdf: LoadedPdf | null;
  isLoading: boolean;
  hasDownloadError: boolean;
  onDownload: () => void;
  isDownloading: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PdfViewerDialog({
  open,
  requestedName,
  pdf,
  isLoading,
  hasDownloadError,
  onDownload,
  isDownloading,
  onOpenChange,
}: PdfViewerDialogProps) {
  const [viewerElement, setViewerElement] = useState<HTMLDivElement | null>(
    null,
  );
  const renderErrorDocumentRef = useRef<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth, setPageWidth] = useState(PDF_VIEWER_DEFAULT_PAGE_WIDTH);
  const [zoom, setZoom] = useState(PDF_VIEWER_DEFAULT_ZOOM);
  const [hasRenderError, setHasRenderError] = useState(false);

  useEffect(() => {
    if (!open || !viewerElement || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateWidth = (width: number) => {
      if (!Number.isFinite(width) || width <= PDF_VIEWER_PAGE_HORIZONTAL_PADDING) {
        return;
      }

      setPageWidth(
        Math.max(
          PDF_VIEWER_MIN_PAGE_WIDTH,
          Math.min(
            Math.floor(width - PDF_VIEWER_PAGE_HORIZONTAL_PADDING),
            PDF_VIEWER_MAX_PAGE_WIDTH,
          ),
        ),
      );
    };
    updateWidth(viewerElement.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateWidth(entry.contentRect.width);
      }
    });
    observer.observe(viewerElement);

    return () => observer.disconnect();
  }, [open, viewerElement]);

  useEffect(() => {
    setPageNumber(1);
    setZoom(PDF_VIEWER_DEFAULT_ZOOM);
    setHasRenderError(false);
    renderErrorDocumentRef.current = null;
  }, [pdf?.documentId]);

  const handleDocumentLoadSuccess = ({ numPages: loadedPages }: { numPages: number }) => {
    setNumPages(loadedPages);
    setPageNumber(1);
    setHasRenderError(false);
  };

  const handleRenderError = (error: Error) => {
    setHasRenderError(true);
    if (pdf && renderErrorDocumentRef.current !== pdf.documentId) {
      renderErrorDocumentRef.current = pdf.documentId;
      toast.error(DOCUMENT_MESSAGES.renderError, {
        description: error.message,
      });
    }
  };

  const showEmptyError = !pdf && hasDownloadError && !isLoading;
  const canZoomOut = Boolean(pdf) && !hasRenderError && zoom > PDF_VIEWER_MIN_ZOOM;
  const canZoomIn = Boolean(pdf) && !hasRenderError && zoom < PDF_VIEWER_MAX_ZOOM;

  const adjustZoom = (amount: number) => {
    setZoom((current) =>
      Math.min(
        PDF_VIEWER_MAX_ZOOM,
        Math.max(PDF_VIEWER_MIN_ZOOM, current + amount),
      ),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[90vh] w-[94vw] max-w-[94vw] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-4 sm:max-w-[94vw]"
      >
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={DOCUMENT_LABELS.closePreview}
            className="absolute top-4 right-4 z-10 shadow-lg ring-2 ring-border"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        <DialogHeader className="pr-12">
          <DialogTitle className="truncate normal-case tracking-normal">
            {pdf?.name ?? requestedName ?? "PDF preview"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview the selected PDF document and navigate between its pages.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={setViewerElement}
          className="relative min-h-0 overflow-auto rounded border bg-muted/30 p-4"
        >
          {pdf && !hasRenderError ? (
            <Document
              key={pdf.documentId}
              file={pdf.data}
              suspense={false}
              loading={
                <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                  <Spinner />
                  {DOCUMENT_MESSAGES.loading}
                </div>
              }
              error={
                <p className="flex h-full items-center justify-center text-destructive">
                  {DOCUMENT_MESSAGES.unavailable}
                </p>
              }
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleRenderError}
              className="flex min-h-full justify-center"
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                scale={zoom}
                suspense={false}
                loading={<Spinner className="m-auto" />}
                onLoadError={handleRenderError}
              />
            </Document>
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center text-muted-foreground">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  {DOCUMENT_MESSAGES.loading}
                </div>
              ) : showEmptyError || hasRenderError ? (
                <p className="text-destructive">{DOCUMENT_MESSAGES.unavailable}</p>
              ) : null}
            </div>
          )}

          {isLoading && pdf ? (
            <div
              role="status"
              className="sticky bottom-3 mx-auto mt-3 flex w-fit items-center gap-2 rounded bg-popover px-4 py-2 shadow ring-1 ring-border"
            >
              <Spinner />
              Loading {requestedName ?? "PDF"}…
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:col-start-2">
            <div
              aria-label="PDF zoom controls"
              className="flex items-center gap-2"
            >
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              aria-label="Zoom out"
              disabled={!canZoomOut}
              onClick={() => adjustZoom(-PDF_VIEWER_ZOOM_STEP)}
            >
              <ZoomOut aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label="Reset zoom to 100%"
              disabled={!pdf || hasRenderError || zoom === PDF_VIEWER_DEFAULT_ZOOM}
              onClick={() => setZoom(PDF_VIEWER_DEFAULT_ZOOM)}
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              aria-label="Zoom in"
              disabled={!canZoomIn}
              onClick={() => adjustZoom(PDF_VIEWER_ZOOM_STEP)}
            >
              <ZoomIn aria-hidden="true" />
            </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pdf || hasRenderError || pageNumber <= 1}
              onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft aria-hidden="true" />
              Previous
            </Button>
            <p aria-live="polite" className="min-w-28 text-center text-sm">
              Page {pdf && numPages > 0 ? pageNumber : 0} of {numPages}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pdf || hasRenderError || numPages === 0 || pageNumber >= numPages}
              onClick={() =>
                setPageNumber((current) => Math.min(numPages, current + 1))
              }
            >
              Next
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!pdf || isDownloading}
            onClick={onDownload}
            className="justify-self-end sm:col-start-3 sm:row-start-1"
          >
            {isDownloading ? <Spinner aria-hidden="true" /> : <Download aria-hidden="true" />}
            {isDownloading ? DOCUMENT_LABELS.saving : DOCUMENT_LABELS.download}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
