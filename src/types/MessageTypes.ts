export type SendMessageParams = {
  workspaceId: string;
  message: string;
};

export type MessageResult = {
  label: string;
  english: string;
  japanese: string;
};

export type SendMessageSuccessResponse = {
  original_message: string;
  response: string;
  raw_response: MessageResult[];
};

export type MessageErrorItem = {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
};

export type SendMessageErrorResponse = {
  detail: MessageErrorItem[];
};
