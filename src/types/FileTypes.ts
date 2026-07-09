export const FILE_STATUS = {
  FILE_UPLOADED: "file_uploaded",
  FILE_CONVERSION_STARTED: "file_conversion_started",
  FILE_CONVERSION_FINISHED: "file_conversion_finished",
  OCR_STARTED: "ocr_started",
  OCR_FINISHED: "ocr_finished",
  TRANSLATION_AND_FORMATTING_STARTED: "translation_and_formatting_started",
  TRANSLATION_AND_FORMATTING_FINISHED: "translation_and_formatting_finished",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type statusFileType = (typeof FILE_STATUS)[keyof typeof FILE_STATUS];

export type WebSocketProgressMessage = {
  status: statusFileType;
  step: string;
  stage: string;
  message: string;
  file_id: string;
  page_number: number | null;
  total_pages: number | null;
  result: Array<Record<string, unknown>> | null;
  error: string | null;
  timestamp: string;
};

export type HistoryEntry = {
  file_id: string;
  message: string;
  status: statusFileType;
  timestamp: string;
};

export type FileUploadType = {
  id: string;
  file: File;
  status: statusFileType;
};
