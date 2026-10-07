import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import {
  mapTreeResponseToUI,
  type ApiWorkspaceDocument,
  type ApiWorkspaceOriginalFile,
  type ApiWorkspacePageFile,
  type ApiWorkspaceTranslationFile,
  type ApiWorkspaceTreeNode,
  type WorkspaceFolderNode,
  type WorkspaceNode,
} from "@/types/WorkspaceTypes";

function buildApiOriginalFile(
  overrides?: Partial<ApiWorkspaceOriginalFile>,
): ApiWorkspaceOriginalFile {
  return {
    id: faker.string.uuid(),
    name: faker.system.fileName(),
    file_role: "original",
    path: faker.system.filePath(),
    status: "completed",
    mime_type: "application/pdf",
    created_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

function buildApiTranslation(
  overrides?: Partial<ApiWorkspaceTranslationFile>,
): ApiWorkspaceTranslationFile {
  return {
    id: faker.string.uuid(),
    name: faker.system.commonFileName("md"),
    language: "EN",
    page_number: faker.number.int({ min: 1, max: 20 }),
    path: faker.system.filePath(),
    status: "completed",
    mime_type: "text/markdown",
    created_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

function buildApiPage(
  overrides?: Partial<ApiWorkspacePageFile>,
): ApiWorkspacePageFile {
  return {
    id: faker.string.uuid(),
    name: faker.system.commonFileName("png"),
    document_id: faker.string.uuid(),
    page_number: faker.number.int({ min: 1, max: 20 }),
    path: faker.system.filePath(),
    status: "completed",
    mime_type: "image/png",
    ...overrides,
  };
}

function buildApiDocument(
  overrides?: Partial<ApiWorkspaceDocument>,
): ApiWorkspaceDocument {
  return {
    id: faker.string.uuid(),
    name: faker.system.commonFileName("pdf"),
    status: "completed",
    language: null,
    mime_type: "application/pdf",
    page_count: 0,
    created_at: faker.date.recent().toISOString(),
    original_files: [],
    translations: {},
    pages: [],
    ...overrides,
  };
}

function buildApiWorkspace(
  overrides?: Partial<ApiWorkspaceTreeNode>,
): ApiWorkspaceTreeNode {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    status: "active",
    files: [],
    ...overrides,
  };
}

function getFolder(
  folder: WorkspaceFolderNode,
  name: string,
): WorkspaceFolderNode {
  const child = folder.children.find(
    (node): node is WorkspaceFolderNode =>
      node.type === "folder" && node.name === name,
  );
  if (!child) {
    throw new Error(`Expected folder ${name}`);
  }
  return child;
}

function getFolderIds(folder: WorkspaceFolderNode): string[] {
  return folder.children.flatMap((child) =>
    child.type === "folder"
      ? [child.id, ...getFolderIds(child)]
      : [],
  );
}

function getFileNodes(nodes: WorkspaceNode[]): Extract<WorkspaceNode, { type: "file" }>[] {
  return nodes.flatMap((node) =>
    node.type === "file" ? [node] : getFileNodes(node.children),
  );
}

describe("mapTreeResponseToUI", () => {
  it("maps document files, translations, and pages into ordered folders", () => {
    // 1. ARRANGE
    const documentId = faker.string.uuid();
    const documentName = `${faker.word.words(2)}.docx`;
    const convertedPdfId = faker.string.uuid();
    const originalFile = buildApiOriginalFile({
      id: documentId,
      name: documentName,
      file_role: "original",
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const convertedPdf = buildApiOriginalFile({
      id: convertedPdfId,
      name: `${documentName.slice(0, -5)}.pdf`,
      file_role: "converted_pdf",
    });
    const japanesePageTwo = buildApiTranslation({
      language: "JP",
      page_number: 2,
      name: faker.system.commonFileName("md"),
    });
    const japanesePageOne = buildApiTranslation({
      language: "JP",
      page_number: 1,
      name: faker.system.commonFileName("md"),
    });
    const englishPageTwo = buildApiTranslation({
      language: "EN",
      page_number: 2,
      name: faker.system.commonFileName("md"),
    });
    const englishPageOne = buildApiTranslation({
      language: "EN",
      page_number: 1,
      name: faker.system.commonFileName("md"),
    });
    const pageTwo = buildApiPage({ page_number: 2 });
    const pageOne = buildApiPage({ page_number: 1 });
    const apiWorkspace = buildApiWorkspace({
      files: [
        buildApiDocument({
          id: documentId,
          name: documentName,
          page_count: 2,
          original_files: [convertedPdf, originalFile],
          translations: {
            japanese: [japanesePageTwo, japanesePageOne],
            english: [englishPageTwo, englishPageOne],
          },
          pages: [pageTwo, pageOne],
        }),
      ],
    });

    // 2. ACT
    const [workspace] = mapTreeResponseToUI({
      workspaces: [apiWorkspace],
    }).workspaces;
    const [documentFolder] = workspace.children;
    const originalFolder = getFolder(documentFolder, "Original file");
    const translationFolder = getFolder(documentFolder, "Translation");
    const pagesFolder = getFolder(documentFolder, "Pages");

    // 3. ASSERT
    expect(documentFolder.name).toBe(documentName.slice(0, -5));
    expect(documentFolder.children.map(({ name }) => name)).toEqual([
      "Original file",
      "Translation",
      "Pages",
    ]);
    expect(originalFolder.children).toEqual([
      {
        type: "file",
        id: originalFile.id,
        name: originalFile.name,
        role: "original",
      },
      {
        type: "file",
        id: convertedPdf.id,
        name: convertedPdf.name,
        role: "converted_pdf",
      },
    ]);
    expect(translationFolder.children.map(({ name }) => name)).toEqual([
      "Japanese",
      "English",
    ]);
    expect(getFolder(translationFolder, "Japanese").children.map(({ id }) => id)).toEqual([
      japanesePageOne.id,
      japanesePageTwo.id,
    ]);
    expect(getFolder(translationFolder, "English").children.map(({ id }) => id)).toEqual([
      englishPageOne.id,
      englishPageTwo.id,
    ]);
    expect(pagesFolder.children.map(({ id }) => id)).toEqual([
      pageOne.id,
      pageTwo.id,
    ]);
    expect(getFileNodes(documentFolder.children).map(({ id }) => id)).toEqual([
      originalFile.id,
      convertedPdf.id,
      japanesePageOne.id,
      japanesePageTwo.id,
      englishPageOne.id,
      englishPageTwo.id,
      pageOne.id,
      pageTwo.id,
    ]);
  });

  it("keeps all three document folders when their collections are empty", () => {
    // 1. ARRANGE
    const apiDocument = buildApiDocument({
      name: `${faker.word.noun()}.pdf`,
      translations: {},
      original_files: [],
      pages: [],
    });

    // 2. ACT
    const [documentFolder] = mapTreeResponseToUI({
      workspaces: [buildApiWorkspace({ files: [apiDocument] })],
    }).workspaces[0].children;

    // 3. ASSERT
    expect(documentFolder.children.map(({ name }) => name)).toEqual([
      "Original file",
      "Translation",
      "Pages",
    ]);
    expect([
      getFolder(documentFolder, "Original file").children,
      getFolder(documentFolder, "Translation").children,
      getFolder(documentFolder, "Pages").children,
    ]).toEqual([[], [], []]);
  });

  it("preserves multi-dot basenames and creates stable unique folder IDs", () => {
    // 1. ARRANGE
    const apiDocument = buildApiDocument({
      id: faker.string.uuid(),
      name: `${faker.word.noun()}.backup.pdf`,
      original_files: [buildApiOriginalFile()],
      translations: {
        english: [buildApiTranslation({ language: "EN" })],
      },
      pages: [buildApiPage()],
    });
    const apiWorkspace = buildApiWorkspace({ files: [apiDocument] });
    const response = { workspaces: [apiWorkspace] };

    // 2. ACT
    const firstWorkspace = mapTreeResponseToUI(response).workspaces[0];
    const secondWorkspace = mapTreeResponseToUI(response).workspaces[0];
    const firstDocumentFolder = firstWorkspace.children[0];
    const secondDocumentFolder = secondWorkspace.children[0];
    const firstFolderIds = getFolderIds(firstDocumentFolder);
    const secondFolderIds = getFolderIds(secondDocumentFolder);

    // 3. ASSERT
    expect(firstDocumentFolder.name).toBe(apiDocument.name.slice(0, -4));
    expect(firstFolderIds).toEqual(secondFolderIds);
    expect(firstFolderIds.length).toBe(new Set(firstFolderIds).size);
  });
});
