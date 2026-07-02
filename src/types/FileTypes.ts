export type statusFileType =
  | "uploading"
  | "transforming"
  | "image-generation"
  | "ocr"
  | "translation"
  | "save-workspace";

export type FileUploadType = {
  id: string;
  file: File;
  status: statusFileType;
};
