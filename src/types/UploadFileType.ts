export type UploadFileSuccessResponse = {
  document_id: string;
  task_id: string;
  workspace_id: string;
  original_filename: string;
  mime_type: string;
  stored_filename: string;
  page_count: number;
  status: string;
  message: string;
};

export type UploadFileErrorDetail = {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input: string;
  ctx: Record<string, unknown>;
};

export type UploadFileErrorResponse = {
  detail: UploadFileErrorDetail[];
};
