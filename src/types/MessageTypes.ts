export type SendMessageParams = {
  workspaceId: string;
  message: string;
};

export type SendMessageSuccessResponse = {
  response: string;
  english_markdown_id: string;
  japanese_markdown_id: string;
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
