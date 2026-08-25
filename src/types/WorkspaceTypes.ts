export type ApiFileNode = {
  type: "file";
  id: string;
  name: string;
  original_name: string | null;
  document_id: string | null;
  kind: string | null;
  language: string | null;
  page_number: number | null;
  mime_type: string | null;
  created_at: string | null;
};

export type ApiFolderNode = {
  type: "folder";
  id: string;
  name: string;
  path: string | null;
  original_name: string | null;
  status: string | null;
  language: string | null;
  mime_type: string | null;
  page_count: number | null;
  created_at: string | null;
  children: ApiTreeNode[];
};

export type ApiTreeNode = ApiFileNode | ApiFolderNode;

export type ApiWorkspaceTreeNode = {
  id: string;
  name: string;
  status: string;
  children: ApiFolderNode[];
};

export type ApiWorkspaceTreeResponse = {
  workspaces: ApiWorkspaceTreeNode[];
};

export type WorkspaceListItem = {
  id: string;
  name: string;
  slug: string;
  storage_key: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ApiWorkspaceListResponse = WorkspaceListItem[];

export type CreateWorkspaceParams = {
  name: string;
};

export type CreateWorkspaceResponse = WorkspaceListItem;

export type DisableWorkspaceResponse = {
  message: string;
};

export type WorkspaceValidationDetail = {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input: string;
  ctx: Record<string, never>;
};

export type WorkspaceValidationErrorResponse = {
  detail: WorkspaceValidationDetail[];
};

export type DisableWorkspaceValidationDetail = WorkspaceValidationDetail;

export type DisableWorkspaceErrorResponse = WorkspaceValidationErrorResponse;

export type WorkspaceFileNode = {
  type: "file";
  id: string;
  name: string;
  originalName: string | null;
  documentId: string | null;
  kind: string | null;
  language: string | null;
  pageNumber: number | null;
  mimeType: string | null;
  createdAt: string | null;
};

export type WorkspaceFolderNode = {
  type: "folder";
  id: string;
  name: string;
  path: string | null;
  originalName: string | null;
  status: string | null;
  language: string | null;
  mimeType: string | null;
  pageCount: number | null;
  createdAt: string | null;
  children: WorkspaceNode[];
};

export type WorkspaceNode = WorkspaceFileNode | WorkspaceFolderNode;

export type Workspace = {
  type: "workspace";
  id: string;
  name: string;
  status: string;
  children: WorkspaceFolderNode[];
};

export type WorkspaceTreeItem = Workspace | WorkspaceNode;

export type WorkspaceTreeResponse = {
  workspaces: Workspace[];
};

function mapFileNode(apiFile: ApiFileNode): WorkspaceFileNode {
  return {
    type: "file",
    id: apiFile.id,
    name: apiFile.name,
    originalName: apiFile.original_name,
    documentId: apiFile.document_id,
    kind: apiFile.kind,
    language: apiFile.language,
    pageNumber: apiFile.page_number,
    mimeType: apiFile.mime_type,
    createdAt: apiFile.created_at,
  };
}

function mapFolderNode(
  folder: ApiFolderNode,
): WorkspaceFolderNode {
  const children: WorkspaceNode[] = [];
  for (const child of folder.children) {
    if (child.type === "file") {
      children.push(mapFileNode(child));
    } else if (child.type === "folder") {
      children.push(mapFolderNode(child));
    } else {
      console.warn("WorkspaceTypes.mapFolderNode: skipping unknown child type", child);
    }
  }
  return {
    type: "folder",
    id: folder.id,
    name: folder.name,
    path: folder.path,
    originalName: folder.original_name,
    status: folder.status,
    language: folder.language,
    mimeType: folder.mime_type,
    pageCount: folder.page_count,
    createdAt: folder.created_at,
    children,
  };
}

function mapWorkspace(apiWs: ApiWorkspaceTreeNode): Workspace {
  return {
    type: "workspace",
    id: apiWs.id,
    name: apiWs.name,
    status: apiWs.status,
    children: apiWs.children.map(mapFolderNode),
  };
}

export function mapTreeResponseToUI(
  api: ApiWorkspaceTreeResponse,
): WorkspaceTreeResponse {
  return { workspaces: api.workspaces.map(mapWorkspace) };
}
