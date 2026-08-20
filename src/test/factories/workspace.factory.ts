import { faker } from "@faker-js/faker";
import type { Workspace, WorkspaceListItem } from "@/types/WorkspaceTypes";

export const buildWorkspace = (overrides?: Partial<Workspace>): Workspace => ({
  type: "workspace",
  id: faker.string.uuid(),
  name: faker.company.name(),
  status: faker.helpers.arrayElement(["ready", "processing", "error"]),
  children: [],
  ...overrides,
});

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
