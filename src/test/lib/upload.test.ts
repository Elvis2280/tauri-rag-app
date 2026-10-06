import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import type { FileUploadType } from "@/types/FileTypes";
import type { WorkspaceFileNode } from "@/types/WorkspaceTypes";
import {
  buildWorkspace,
  buildWorkspaceFolderNode,
} from "@/test/factories/workspace.factory";
import { FILE_STATUS } from "@/types/FileTypes";
import { findDuplicateUploadFiles } from "@/lib/upload";

function buildUploadFile(name: string): FileUploadType {
  return {
    id: faker.string.uuid(),
    file: new File([faker.lorem.word()], name),
    status: FILE_STATUS.FILE_UPLOADED,
  };
}

function buildWorkspaceFile(
  overrides?: Partial<WorkspaceFileNode>,
): WorkspaceFileNode {
  return {
    type: "file",
    id: faker.string.uuid(),
    name: faker.system.fileName(),
    originalName: null,
    documentId: null,
    kind: null,
    language: null,
    pageNumber: null,
    mimeType: null,
    createdAt: null,
    ...overrides,
  };
}

describe("findDuplicateUploadFiles", () => {
  it("matches nested workspace files using originalName before name", () => {
    // 1. ARRANGE
    const originalName = faker.system.fileName();
    const storedName = faker.system.fileName();
    const selectedFile = buildUploadFile(originalName);
    const workspace = buildWorkspace({
      children: [
        buildWorkspaceFolderNode({
          children: [
            buildWorkspaceFile({ name: storedName, originalName }),
          ],
        }),
      ],
    });

    // 2. ACT
    const duplicates = findDuplicateUploadFiles([selectedFile], workspace);

    // 3. ASSERT
    expect(duplicates).toEqual([selectedFile]);
    expect(
      findDuplicateUploadFiles([buildUploadFile(storedName)], workspace),
    ).toEqual([]);
  });

  it("falls back to the displayed node name when originalName is absent", () => {
    // 1. ARRANGE
    const existingName = faker.string.alpha({ length: 12, casing: "lower" });
    const selectedFile = buildUploadFile(existingName);
    const workspace = buildWorkspace({
      children: [
        buildWorkspaceFolderNode({
          children: [buildWorkspaceFile({ name: existingName })],
        }),
      ],
    });

    // 2. ACT
    const duplicates = findDuplicateUploadFiles([selectedFile], workspace);

    // 3. ASSERT
    expect(duplicates).toEqual([selectedFile]);
  });

  it("matches the base filename when the extensions differ", () => {
    // 1. ARRANGE
    const selectedFile = buildUploadFile(
      `${faker.string.alpha({ length: 10, casing: "lower" })}.pdf`,
    );
    const workspace = buildWorkspace({
      children: [
        buildWorkspaceFolderNode({
          children: [
            buildWorkspaceFile({
              name: `${selectedFile.file.name.replace(".pdf", "")}.docx`,
            }),
          ],
        }),
      ],
    });

    // 2. ACT
    const duplicates = findDuplicateUploadFiles([selectedFile], workspace);

    // 3. ASSERT
    expect(duplicates).toEqual([selectedFile]);
  });

  it("removes only the final extension and preserves leading dots", () => {
    // 1. ARRANGE
    const multiDotBase = faker.string.alpha({ length: 10, casing: "lower" });
    const multiDotFile = buildUploadFile(`${multiDotBase}.backup.pdf`);
    const hiddenFile = buildUploadFile(`.${faker.string.alpha({ length: 10 })}`);
    const extensionlessFile = buildUploadFile(
      faker.string.alpha({ length: 10, casing: "lower" }),
    );
    const workspace = buildWorkspace({
      children: [
        buildWorkspaceFolderNode({
          name: `${faker.string.alpha({ length: 8 })} folder`,
          children: [
            buildWorkspaceFile({ name: `${multiDotBase}.backup.docx` }),
            buildWorkspaceFile({ name: hiddenFile.file.name }),
            buildWorkspaceFile({ name: extensionlessFile.file.name }),
          ],
        }),
      ],
    });

    // 2. ACT
    const duplicates = findDuplicateUploadFiles(
      [multiDotFile, hiddenFile, extensionlessFile],
      workspace,
    );

    // 3. ASSERT
    expect(duplicates).toEqual([multiDotFile, hiddenFile, extensionlessFile]);
  });

  it("does not compare folder names as uploaded files", () => {
    // 1. ARRANGE
    const folderName = faker.system.fileName();
    const selectedFile = buildUploadFile(folderName);
    const workspace = buildWorkspace({
      children: [buildWorkspaceFolderNode({ name: folderName })],
    });

    // 2. ACT
    const duplicates = findDuplicateUploadFiles([selectedFile], workspace);

    // 3. ASSERT
    expect(duplicates).toEqual([]);
  });

  it("keeps matching case-sensitive and scoped to the selected workspace", () => {
    // 1. ARRANGE
    const existingName = faker.string.alpha({ length: 12, casing: "lower" });
    const workspace = buildWorkspace({
      children: [
        buildWorkspaceFolderNode({
          children: [buildWorkspaceFile({ name: existingName })],
        }),
      ],
    });
    const otherWorkspace = buildWorkspace({
      children: [
        buildWorkspaceFolderNode({
          children: [buildWorkspaceFile({ name: faker.system.fileName() })],
        }),
      ],
    });

    // 2. ACT
    const exactMatch = findDuplicateUploadFiles(
      [buildUploadFile(existingName)],
      workspace,
    );
    const caseMismatch = findDuplicateUploadFiles(
      [buildUploadFile(existingName.toUpperCase())],
      workspace,
    );
    const otherWorkspaceMatch = findDuplicateUploadFiles(
      [buildUploadFile(existingName)],
      otherWorkspace,
    );

    // 3. ASSERT
    expect(exactMatch).toHaveLength(1);
    expect(caseMismatch).toHaveLength(0);
    expect(otherWorkspaceMatch).toHaveLength(0);
  });
});
