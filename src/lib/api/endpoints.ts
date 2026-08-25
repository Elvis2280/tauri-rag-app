export const WORKSPACE_ENDPOINTS = {
  tree: "/workspace/tree",
  list: "/workspace/list",
  disable: (workspaceId: string) => `/workspace/${workspaceId}/disable`,
} as const;

export const DOCUMENT_ENDPOINTS = {
  upload: "/documents/upload",
} as const;

export const CHAT_ENDPOINTS = {
  send: "/chat",
} as const;
