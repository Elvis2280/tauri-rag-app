import { faker } from "@faker-js/faker";
import type { Workspace } from "@/types/WorkspaceTypes";

export const buildWorkspace = (overrides?: Partial<Workspace>): Workspace => ({
  type: "workspace",
  id: faker.string.uuid(),
  name: faker.company.name(),
  status: faker.helpers.arrayElement(["ready", "processing", "error"]),
  children: [],
  ...overrides,
});
