export type SendMessageParams = {
  workspaceId: string;
  message: string;
};

export type SendMessageSuccessResponse = {
  response: string;
  english_markdown_id: string | null;
  japanese_markdown_id: string | null;
  sources: Array<{
    document_id: string;
    page_number: number;
    english_markdown_id: string;
    japanese_markdown_id: string;
  }>;
};

export type ChatJobStatus = "queued" | "running" | "completed" | "failed";

export type ChatJobResponse = {
  id: string;
  status: ChatJobStatus;
  answer: SendMessageSuccessResponse | null;
  error: { status_code: number; message: string } | null;
};

export type MessageErrorItem = {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
};

export type SendMessageValidationErrorResponse = {
  detail: MessageErrorItem[];
};

export type SendMessageDetailsErrorResponse = {
  detail: string;
};

export type SendMessageErrorResponse =
  | SendMessageValidationErrorResponse
  | SendMessageDetailsErrorResponse
  | { message: string };
