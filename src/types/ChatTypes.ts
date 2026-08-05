export const CHAT_ROLE = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export type ChatRole = (typeof CHAT_ROLE)[keyof typeof CHAT_ROLE];

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};
