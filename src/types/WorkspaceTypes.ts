export type WorkspaceStatus = "active" | "disabled";

export type WorkspaceFileNode = {
  type: "file";
  id: string;
  name: string;
};

export type WorkspaceFolderNode = {
  type: "folder";
  id: string;
  name: string;
  path: string;
  children: WorkspaceNode[];
};

export type WorkspaceNode = WorkspaceFileNode | WorkspaceFolderNode;

export type Workspace = {
  type: "workspace";
  id: string;
  name: string;
  status: WorkspaceStatus;
  children: WorkspaceNode[];
};

export type WorkspaceTreeItem = Workspace | WorkspaceNode;

export type WorkspaceTreeResponse = {
  workspaces: Workspace[];
};

export type ApiFileNode = {
  type: "file";
  id: string;
  name: string;
};

export type ApiFolderNode = {
  type: "folder";
  name: string;
  path: string;
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

function synthesizeFolderId(workspaceId: string, folder: ApiFolderNode): string {
  return `${workspaceId}::${folder.path}`;
}

function mapFolderNode(
  workspaceId: string,
  folder: ApiFolderNode,
): WorkspaceFolderNode {
  return {
    type: "folder",
    id: synthesizeFolderId(workspaceId, folder),
    name: folder.name,
    path: folder.path,
    children: folder.children.map((child) => {
      if (child.type === "file") {
        return {
          type: "file",
          id: child.id,
          name: child.name,
        };
      }
      return mapFolderNode(workspaceId, child);
    }),
  };
}

function mapWorkspace(apiWs: ApiWorkspaceTreeNode): Workspace {
  return {
    type: "workspace",
    id: apiWs.id,
    name: apiWs.name,
    status:
      apiWs.status === "active" || apiWs.status === "disabled"
        ? apiWs.status
        : "active",
    children: apiWs.children.map((folder) => mapFolderNode(apiWs.id, folder)),
  };
}

export function mapTreeResponseToUI(
  api: ApiWorkspaceTreeResponse,
): WorkspaceTreeResponse {
  return { workspaces: api.workspaces.map(mapWorkspace) };
}
