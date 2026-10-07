export const WORKSPACE_ENDPOINTS = {
  create: "/workspace",
  tree: "/workspace/tree",
  list: "/workspace/list",
  disable: (workspaceId: string) => `/workspace/${workspaceId}/disable`,
} as const;

export const DOCUMENT_ENDPOINTS = {
  upload: "/documents/upload",
  pdf: (documentId: string) => `/documents/${documentId}/pdf`,
  markdown: (fileId: string) => `/documents/${fileId}/markdown`,
  image: (fileId: string) => `/documents/${fileId}/images`,
} as const;

export const CHAT_ENDPOINTS = {
  send: "/chat",
} as const;
