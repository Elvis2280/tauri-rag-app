export const DOCUMENT_MESSAGES = {
  downloadError: "Failed to load PDF",
  saveError: "Failed to save PDF",
  saveSuccess: "PDF saved successfully",
  renderError: "Failed to render PDF",
  loading: "Loading PDF…",
  unavailable: "Unable to display this PDF.",
} as const;

export const DOCUMENT_LABELS = {
  closePreview: "Close PDF preview",
  download: "Download",
  saving: "Saving…",
} as const;

export const PDF_FILE_EXTENSION = "pdf";
export const PDF_FILE_FILTER_NAME = "PDF document";

export const DOCUMENT_UUID_PATTERN =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export const PDF_VIEWER_DEFAULT_PAGE_WIDTH = 800;
export const PDF_VIEWER_PAGE_HORIZONTAL_PADDING = 48;
export const PDF_VIEWER_MIN_PAGE_WIDTH = 280;
export const PDF_VIEWER_MAX_PAGE_WIDTH = 1100;
export const PDF_VIEWER_DEFAULT_ZOOM = 1;
export const PDF_VIEWER_MIN_ZOOM = 0.5;
export const PDF_VIEWER_MAX_ZOOM = 2;
export const PDF_VIEWER_ZOOM_STEP = 0.25;
