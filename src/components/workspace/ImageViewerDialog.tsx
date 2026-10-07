import { useEffect, useRef, useState } from "react";
import { Download, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import {
  IMAGE_LABELS,
  IMAGE_MESSAGES,
  IMAGE_VIEWER_CONTAINER_PADDING,
  IMAGE_VIEWER_DEFAULT_ZOOM,
  IMAGE_VIEWER_MAX_ZOOM,
  IMAGE_VIEWER_MIN_ZOOM,
  IMAGE_VIEWER_ZOOM_STEP,
} from "@/constants/image";
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

export type LoadedImage = {
  fileId: string;
  name: string;
  mimeType: string;
  data: Uint8Array;
};

type ImageViewerDialogProps = {
  open: boolean;
  requestedName: string | null;
  image: LoadedImage | null;
  isLoading: boolean;
  hasLoadError: boolean;
  onDownload: () => void;
  isDownloading: boolean;
  onOpenChange: (open: boolean) => void;
};

type ImageDimensions = {
  fileId: string;
  width: number;
  height: number;
};

export default function ImageViewerDialog({
  open,
  requestedName,
  image,
  isLoading,
  hasLoadError,
  onDownload,
  isDownloading,
  onOpenChange,
}: ImageViewerDialogProps) {
  const [viewerElement, setViewerElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [imageSource, setImageSource] = useState<{
    fileId: string;
    url: string;
  } | null>(null);
  const [naturalSize, setNaturalSize] = useState<ImageDimensions | null>(null);
  const [fittedSize, setFittedSize] = useState<ImageDimensions | null>(null);
  const [zoom, setZoom] = useState(IMAGE_VIEWER_DEFAULT_ZOOM);
  const [hasRenderError, setHasRenderError] = useState(false);
  const renderErrorFileRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !image) {
      setImageSource(null);
      setNaturalSize(null);
      setFittedSize(null);
      setHasRenderError(false);
      renderErrorFileRef.current = null;
      return;
    }

    const imageBytes = new Uint8Array(image.data);
    const imageUrl = URL.createObjectURL(
      new Blob([imageBytes], { type: image.mimeType }),
    );
    setImageSource({ fileId: image.fileId, url: imageUrl });
    setNaturalSize(null);
    setFittedSize(null);
    setHasRenderError(false);
    renderErrorFileRef.current = null;

    return () => URL.revokeObjectURL(imageUrl);
  }, [open, image?.fileId, image?.data, image?.mimeType]);

  useEffect(() => {
    setZoom(IMAGE_VIEWER_DEFAULT_ZOOM);
  }, [image?.fileId]);

  const currentNaturalSize =
    naturalSize?.fileId === image?.fileId ? naturalSize : null;

  useEffect(() => {
    if (!open || !viewerElement || !currentNaturalSize) {
      return;
    }

    const updateFittedSize = () => {
      const availableWidth = Math.max(
        0,
        viewerElement.clientWidth - IMAGE_VIEWER_CONTAINER_PADDING,
      );
      const availableHeight = Math.max(
        0,
        viewerElement.clientHeight - IMAGE_VIEWER_CONTAINER_PADDING,
      );
      if (availableWidth === 0 || availableHeight === 0) {
        return;
      }

      const scale = Math.min(
        1,
        availableWidth / currentNaturalSize.width,
        availableHeight / currentNaturalSize.height,
      );
      setFittedSize({
        fileId: currentNaturalSize.fileId,
        width: currentNaturalSize.width * scale,
        height: currentNaturalSize.height * scale,
      });
    };

    updateFittedSize();
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateFittedSize);
    observer.observe(viewerElement);
    return () => observer.disconnect();
  }, [open, viewerElement, currentNaturalSize]);

  const currentImageUrl =
    imageSource && open && image?.fileId === imageSource.fileId
      ? imageSource.url
      : null;
  const currentFittedSize = fittedSize?.fileId === image?.fileId ? fittedSize : null;
  const displayWidth = currentFittedSize
    ? currentFittedSize.width * zoom
    : undefined;
  const displayHeight = currentFittedSize
    ? currentFittedSize.height * zoom
    : undefined;
  const showEmptyError = !image && hasLoadError && !isLoading;
  const canZoomOut = Boolean(currentImageUrl) && zoom > IMAGE_VIEWER_MIN_ZOOM;
  const canZoomIn = Boolean(currentImageUrl) && zoom < IMAGE_VIEWER_MAX_ZOOM;

  const adjustZoom = (amount: number) => {
    setZoom((current) =>
      Math.min(
        IMAGE_VIEWER_MAX_ZOOM,
        Math.max(IMAGE_VIEWER_MIN_ZOOM, current + amount),
      ),
    );
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (!image) {
      return;
    }
    setNaturalSize({
      fileId: image.fileId,
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    });
  };

  const handleImageError = () => {
    setHasRenderError(true);
    if (image && renderErrorFileRef.current !== image.fileId) {
      renderErrorFileRef.current = image.fileId;
      toast.error(IMAGE_MESSAGES.renderError, {
        description: image.name,
      });
    }
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
            aria-label={IMAGE_LABELS.closePreview}
            className="absolute top-4 right-4 z-10 shadow-lg ring-2 ring-border"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        <DialogHeader className="pr-12">
          <DialogTitle className="truncate normal-case tracking-normal">
            {image?.name ?? requestedName ?? "Image preview"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview and zoom the selected image.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={setViewerElement}
          className="relative min-h-0 overflow-auto rounded border bg-muted/30 p-4"
        >
          {image && currentImageUrl && !hasRenderError ? (
            <div
              className="grid min-h-full min-w-full place-items-center"
              style={{
                width: `max(100%, ${displayWidth ?? 0}px)`,
                height: `max(100%, ${displayHeight ?? 0}px)`,
              }}
            >
              <img
                key={image.fileId}
                src={currentImageUrl}
                alt={image.name}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="block max-h-full max-w-full object-contain"
                style={
                  displayWidth && displayHeight
                    ? { width: displayWidth, height: displayHeight }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center text-muted-foreground">
              {isLoading || (image && !currentImageUrl && !hasRenderError) ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  {isLoading ? IMAGE_MESSAGES.loading : IMAGE_MESSAGES.preparing}
                </div>
              ) : showEmptyError || hasRenderError ? (
                <p role="alert" className="text-destructive">
                  {IMAGE_MESSAGES.unavailable}
                </p>
              ) : null}
            </div>
          )}

          {isLoading && image ? (
            <div
              role="status"
              className="sticky bottom-3 mx-auto mt-3 flex w-fit items-center gap-2 rounded bg-popover px-4 py-2 shadow ring-1 ring-border"
            >
              <Spinner />
              {IMAGE_MESSAGES.loading}
            </div>
          ) : null}
          {hasLoadError && image && !isLoading ? (
            <p role="alert" className="mt-4 text-center text-sm text-destructive">
              {IMAGE_MESSAGES.unavailable}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div
            aria-label="Image zoom controls"
            className="flex items-center justify-center gap-2 sm:col-start-2"
          >
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              aria-label="Zoom out"
              disabled={!canZoomOut || hasRenderError}
              onClick={() => adjustZoom(-IMAGE_VIEWER_ZOOM_STEP)}
            >
              <ZoomOut aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label="Reset zoom to 100%"
              disabled={!currentImageUrl || hasRenderError || zoom === IMAGE_VIEWER_DEFAULT_ZOOM}
              onClick={() => setZoom(IMAGE_VIEWER_DEFAULT_ZOOM)}
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              aria-label="Zoom in"
              disabled={!canZoomIn || hasRenderError}
              onClick={() => adjustZoom(IMAGE_VIEWER_ZOOM_STEP)}
            >
              <ZoomIn aria-hidden="true" />
            </Button>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!image || isDownloading}
            onClick={onDownload}
            className="justify-self-end sm:col-start-3 sm:row-start-1"
          >
            {isDownloading ? <Spinner aria-hidden="true" /> : <Download aria-hidden="true" />}
            {isDownloading ? IMAGE_LABELS.saving : IMAGE_LABELS.download}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
