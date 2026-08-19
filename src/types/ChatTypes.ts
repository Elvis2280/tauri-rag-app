export const CHAT_ROLE = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export const CHAT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type ChatRole = (typeof CHAT_ROLE)[keyof typeof CHAT_ROLE];
export type ChatStatus = (typeof CHAT_STATUS)[keyof typeof CHAT_STATUS];

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status: ChatStatus
};
