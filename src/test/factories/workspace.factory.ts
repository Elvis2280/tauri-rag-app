import { faker } from "@faker-js/faker";
import type {
  Workspace,
  WorkspaceFileNode,
  WorkspaceFolderNode,
  WorkspaceListItem,
} from "@/types/WorkspaceTypes";
import { removeFileExtension } from "@/types/WorkspaceTypes";

export const buildWorkspace = (overrides?: Partial<Workspace>): Workspace => ({
  type: "workspace",
  id: faker.string.uuid(),
  name: faker.company.name(),
  children: [],
  ...overrides,
});

export const buildWorkspaceFolderNode = (
  overrides?: Partial<WorkspaceFolderNode>,
): WorkspaceFolderNode => ({
  type: "folder",
  id: faker.string.uuid(),
  name: faker.system.directoryPath(),
  children: [],
  ...overrides,
});

export const buildWorkspaceFileNode = (
  overrides?: Partial<WorkspaceFileNode>,
): WorkspaceFileNode => ({
  type: "file",
  id: faker.string.uuid(),
  name: faker.system.commonFileName("pdf"),
  role: "original",
  ...overrides,
});

export const buildWorkspaceDocumentFolder = (
  fileOverrides?: Partial<WorkspaceFileNode>,
  folderOverrides?: Partial<WorkspaceFolderNode>,
): WorkspaceFolderNode => {
  const file = buildWorkspaceFileNode(fileOverrides);

  return buildWorkspaceFolderNode({
    name: removeFileExtension(file.name),
    children: [file],
    ...folderOverrides,
  });
};

export const buildWorkspaceListItem = (
  overrides?: Partial<WorkspaceListItem>,
): WorkspaceListItem => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
  storage_key: faker.string.alphanumeric(12),
  status: "ready",
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
  ...overrides,
});
