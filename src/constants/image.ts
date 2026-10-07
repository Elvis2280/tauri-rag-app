export const IMAGE_MESSAGES = {
  loadError: "Failed to load image",
  saveError: "Failed to save image",
  saveSuccess: "Image saved successfully",
  renderError: "Failed to display this image",
  loading: "Loading image…",
  preparing: "Preparing image preview…",
  unavailable: "Unable to display this image.",
} as const;

export const IMAGE_LABELS = {
  closePreview: "Close image preview",
  download: "Download",
  saving: "Saving…",
} as const;

export const IMAGE_FILE_FILTER_NAME = "Image file";

export const IMAGE_MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

export const IMAGE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/webp": "webp",
};

export const IMAGE_VIEWER_DEFAULT_ZOOM = 1;
export const IMAGE_VIEWER_MIN_ZOOM = 0.5;
export const IMAGE_VIEWER_MAX_ZOOM = 2;
export const IMAGE_VIEWER_ZOOM_STEP = 0.25;
export const IMAGE_VIEWER_CONTAINER_PADDING = 32;
