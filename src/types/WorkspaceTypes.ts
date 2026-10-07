import {
  TRANSLATION_LANGUAGE_NAMES,
  WORKSPACE_TREE_LABELS,
} from "@/constants/workspace";

export type ApiWorkspaceOriginalFile = {
  id: string;
  name: string;
  file_role: "original" | "converted_pdf";
  path: string;
  status: string;
  mime_type: string;
  created_at: string;
};

export type ApiWorkspaceTranslationFile = {
  id: string;
  name: string;
  language: string;
  page_number: number;
  path: string;
  status: string;
  mime_type: string;
  created_at: string;
};

export type ApiWorkspacePageFile = {
  id: string;
  name: string;
  document_id: string;
  page_number: number;
  path: string;
  status: string;
  mime_type: string;
};

export type ApiWorkspaceDocument = {
  id: string;
  name: string;
  status: string;
  language: string | null;
  mime_type: string;
  page_count: number;
  created_at: string;
  original_files: ApiWorkspaceOriginalFile[];
  translations: Record<string, ApiWorkspaceTranslationFile[]>;
  pages: ApiWorkspacePageFile[];
};

export type ApiWorkspaceTreeNode = {
  id: string;
  name: string;
  status: string;
  files: ApiWorkspaceDocument[];
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

export type WorkspaceFileRole =
  | ApiWorkspaceOriginalFile["file_role"]
  | "translation"
  | "page";

export type WorkspaceFileNode = {
  type: "file";
  id: string;
  name: string;
  role: WorkspaceFileRole;
  mimeType?: string;
};

export type WorkspaceFolderNode = {
  type: "folder";
  id: string;
  name: string;
  children: WorkspaceNode[];
};

export type WorkspaceNode = WorkspaceFileNode | WorkspaceFolderNode;

export type Workspace = {
  type: "workspace";
  id: string;
  name: string;
  children: WorkspaceFolderNode[];
};

export type WorkspaceTreeItem = Workspace | WorkspaceNode;

export type WorkspaceTreeResponse = {
  workspaces: Workspace[];
};

export function removeFileExtension(name: string): string {
  const trimmedName = name.trim();
  const extensionSeparator = trimmedName.lastIndexOf(".");

  if (
    extensionSeparator <= 0 ||
    extensionSeparator === trimmedName.length - 1
  ) {
    return name;
  }

  return trimmedName.slice(0, extensionSeparator);
}

function createFolder(
  id: string,
  name: string,
  children: WorkspaceNode[],
): WorkspaceFolderNode {
  return { type: "folder", id, name, children };
}

function mapOriginalFile(
  file: ApiWorkspaceOriginalFile,
): WorkspaceFileNode {
  return {
    type: "file",
    id: file.id,
    name: file.name,
    role: file.file_role,
    mimeType: file.mime_type,
  };
}

function mapTranslationFile(
  file: ApiWorkspaceTranslationFile,
): WorkspaceFileNode {
  return {
    type: "file",
    id: file.id,
    name: file.name,
    role: "translation",
    mimeType: file.mime_type,
  };
}

function mapPageFile(file: ApiWorkspacePageFile): WorkspaceFileNode {
  return {
    type: "file",
    id: file.id,
    name: file.name,
    role: "page",
    mimeType: file.mime_type,
  };
}

function getLanguageFolderName(language: string): string {
  const normalizedLanguage = language.trim().replace(/[_-]+/g, " ");
  const knownLanguageName = Object.entries(TRANSLATION_LANGUAGE_NAMES).find(
    ([languageKey]) => languageKey === normalizedLanguage.toLocaleLowerCase(),
  )?.[1];
  if (knownLanguageName) {
    return knownLanguageName;
  }

  return normalizedLanguage.replace(/\b\p{L}/gu, (character) =>
    character.toLocaleUpperCase(),
  );
}

function getLanguageSortOrder(language: string): number {
  const normalizedLanguage = language.toLocaleLowerCase();
  if (normalizedLanguage === "japanese") {
    return 0;
  }
  if (normalizedLanguage === "english") {
    return 1;
  }
  return 2;
}

function compareByPageNumber(
  left: { page_number: number; name: string; id: string },
  right: { page_number: number; name: string; id: string },
): number {
  return (
    left.page_number - right.page_number ||
    left.name.localeCompare(right.name) ||
    left.id.localeCompare(right.id)
  );
}

function compareOriginalFileRole(
  left: ApiWorkspaceOriginalFile,
  right: ApiWorkspaceOriginalFile,
): number {
  if (left.file_role === right.file_role) {
    return left.name.localeCompare(right.name);
  }
  return left.file_role === "original" ? -1 : 1;
}

function mapDocument(
  workspaceId: string,
  document: ApiWorkspaceDocument,
): WorkspaceFolderNode {
  const folderId = `document:${workspaceId}:${document.id}`;
  const originalFiles = [...document.original_files]
    .sort(compareOriginalFileRole)
    .map(mapOriginalFile);
  const languageFolders = Object.entries(document.translations)
    .sort(([leftLanguage], [rightLanguage]) => {
      const languageOrder =
        getLanguageSortOrder(leftLanguage) -
        getLanguageSortOrder(rightLanguage);
      return languageOrder || leftLanguage.localeCompare(rightLanguage);
    })
    .map(([language, files]) =>
      createFolder(
        `${folderId}:translation:${encodeURIComponent(language)}`,
        getLanguageFolderName(language),
        [...files].sort(compareByPageNumber).map(mapTranslationFile),
      ),
    );
  const pages = [...document.pages]
    .sort(compareByPageNumber)
    .map(mapPageFile);

  return createFolder(folderId, removeFileExtension(document.name), [
    createFolder(
      `${folderId}:original-files`,
      WORKSPACE_TREE_LABELS.originalFile,
      originalFiles,
    ),
    createFolder(
      `${folderId}:translations`,
      WORKSPACE_TREE_LABELS.translation,
      languageFolders,
    ),
    createFolder(`${folderId}:pages`, WORKSPACE_TREE_LABELS.pages, pages),
  ]);
}

function mapWorkspace(apiWorkspace: ApiWorkspaceTreeNode): Workspace {
  return {
    type: "workspace",
    id: apiWorkspace.id,
    name: apiWorkspace.name,
    children: apiWorkspace.files.map((file) =>
      mapDocument(apiWorkspace.id, file),
    ),
  };
}

export function mapTreeResponseToUI(
  api: ApiWorkspaceTreeResponse,
): WorkspaceTreeResponse {
  return { workspaces: api.workspaces.map(mapWorkspace) };
}
