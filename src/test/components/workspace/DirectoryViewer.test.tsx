import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import type { CSSProperties, ReactNode } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DirectoryViewer from "@/components/workspace/DirectoryViewer";
import {
  buildWorkspace,
  buildWorkspaceDocumentFolder,
  buildWorkspaceFileNode,
  buildWorkspaceFolderNode,
  buildWorkspaceListItem,
} from "@/test/factories/workspace.factory";
import type { WorkspaceTreeItem } from "@/types/WorkspaceTypes";

const mockTreeHeight = vi.fn();
const mockNodeSelect = vi.fn();
const mockNodeToggle = vi.fn();
const mockDisableWorkspace = vi.fn();
const mockCreateWorkspace = vi.fn();
const mockLoadPdf = vi.fn();
const mockSavePdf = vi.fn();
const mockTreeNodeIds: string[] = [];

vi.mock("@/hooks/useWorkspace", () => ({
  useCreateWorkspace: () => ({
    createWorkspace: mockCreateWorkspace,
    isPending: false,
    error: null,
  }),
  useDisableWorkspace: () => ({
    disableWorkspace: mockDisableWorkspace,
    isPending: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useDocument", () => ({
  useDocumentPdf: () => ({
    loadPdf: mockLoadPdf,
    savePdf: mockSavePdf,
    isPending: false,
    isSaving: false,
    error: null,
  }),
}));

vi.mock("@/components/workspace/PdfViewerDialog", () => ({
  default: ({
    open,
    pdf,
    isLoading,
    hasDownloadError,
    onDownload,
    isDownloading,
  }: {
    open: boolean;
    pdf: { name: string } | null;
    isLoading: boolean;
    hasDownloadError: boolean;
    onDownload: () => void;
    isDownloading: boolean;
  }) =>
    open ? (
      <div role="dialog">
        {isLoading ? "Loading PDF" : null}
        {hasDownloadError ? "PDF failed" : null}
        {pdf?.name ?? null}
        {pdf ? (
          <button type="button" onClick={onDownload} disabled={isDownloading}>
            Download
          </button>
        ) : null}
      </div>
    ) : null,
}));

vi.mock("react-arborist", () => ({
  Tree: ({
    data,
    height,
    children,
    onActivate,
    idAccessor,
  }: {
    data: WorkspaceTreeItem[];
    height: number;
    idAccessor?: string | ((item: WorkspaceTreeItem) => string);
    children: (props: {
      node: {
        data: WorkspaceTreeItem;
        isOpen: boolean;
        isSelected: boolean;
        select: () => void;
        toggle: () => void;
        activate: () => void;
      };
      style: CSSProperties;
    }) => ReactNode;
    onActivate?: (node: {
      data: WorkspaceTreeItem;
      isOpen: boolean;
      isSelected: boolean;
      select: () => void;
      toggle: () => void;
      activate: () => void;
    }) => void;
  }) => {
    mockTreeHeight(height);

    const getNodeId = (item: WorkspaceTreeItem): string =>
      typeof idAccessor === "function"
        ? idAccessor(item)
        : typeof idAccessor === "string"
          ? String(item[idAccessor as keyof WorkspaceTreeItem])
          : item.id;

    const renderNode = (item: WorkspaceTreeItem): ReactNode => {
      const nodeId = getNodeId(item);
      mockTreeNodeIds.push(nodeId);
      const node = {
        data: item,
        isOpen: false,
        isSelected: false,
        select: mockNodeSelect,
        toggle: () => mockNodeToggle(nodeId),
        activate: vi.fn(),
      };
      node.activate = vi.fn(() => onActivate?.(node));

      return (
        <div
          key={nodeId}
          role="treeitem"
          onClick={(event) => {
            event.stopPropagation();
            node.select();
            node.activate();
          }}
        >
          {children({ node, style: {} })}
          {"children" in item ? item.children.map(renderNode) : null}
        </div>
      );
    };

    return (
      <div data-testid="tree" style={{ height }}>
        {data.map(renderNode)}
      </div>
    );
  },
}));

function setWindowHeight(height: number) {
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
    writable: true,
  });
}

describe("DirectoryViewer", () => {
  beforeEach(() => {
    setWindowHeight(800);
    mockTreeHeight.mockClear();
    mockNodeSelect.mockClear();
    mockNodeToggle.mockClear();
    mockDisableWorkspace.mockReset();
    mockCreateWorkspace.mockReset();
    mockLoadPdf.mockReset();
    mockSavePdf.mockReset();
    mockTreeNodeIds.length = 0;
    mockLoadPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70, 45]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets the tree height to the window height on initial render", () => {
    // 1. ARRANGE
    const workspaces = [buildWorkspace()];

    // 2. ACT
    render(<DirectoryViewer workspaces={workspaces} />);

    // 3. ASSERT
    expect(mockTreeHeight).toHaveBeenCalledTimes(1);
    expect(mockTreeHeight).toHaveBeenCalledWith(800);
  });

  it("updates the tree height when the window is resized", () => {
    // 1. ARRANGE
    const workspaces = [buildWorkspace()];
    render(<DirectoryViewer workspaces={workspaces} />);
    setWindowHeight(500);

    // 2. ACT
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    // 3. ASSERT
    expect(mockTreeHeight).toHaveBeenLastCalledWith(500);
  });

  it("removes the resize listener on unmount", () => {
    // 1. ARRANGE
    const workspaces = [buildWorkspace()];
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<DirectoryViewer workspaces={workspaces} />);

    // 2. ACT
    unmount();

    // 3. ASSERT
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("renders the delete button only for top-level workspace rows", () => {
    // 1. ARRANGE
    const child = buildWorkspaceFolderNode();
    const workspace = buildWorkspace({ children: [child] });

    // 2. ACT
    render(<DirectoryViewer workspaces={[workspace]} />);

    // 3. ASSERT
    expect(
      screen.getByRole("button", { name: `Delete ${workspace.name}` }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `Delete ${child.name}` }),
    ).not.toBeInTheDocument();
  });

  it("opens the delete modal without selecting the workspace row", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = buildWorkspace();

    // 2. ACT
    render(<DirectoryViewer workspaces={[workspace]} />);
    await user.click(
      screen.getByRole("button", { name: `Delete ${workspace.name}` }),
    );

    // 3. ASSERT
    expect(mockNodeSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Delete this workspace?",
    );
    expect(
      within(screen.getByRole("dialog")).getByText(workspace.name),
    ).toBeInTheDocument();
  });

  it("disables the selected workspace after confirmation", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = buildWorkspace();
    mockDisableWorkspace.mockResolvedValue({
      message: faker.lorem.sentence(),
    });

    // 2. ACT
    render(<DirectoryViewer workspaces={[workspace]} />);
    await user.click(
      screen.getByRole("button", { name: `Delete ${workspace.name}` }),
    );
    await user.click(screen.getByRole("button", { name: "Delete workspace" }));

    // 3. ASSERT
    expect(mockDisableWorkspace).toHaveBeenCalledWith(workspace.id);
  });

  it("creates a workspace from the create modal", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspaceName = faker.company.name();
    mockCreateWorkspace.mockResolvedValue(buildWorkspaceListItem({
      name: workspaceName,
    }));

    // 2. ACT
    render(<DirectoryViewer workspaces={[]} />);
    await user.click(screen.getByRole("button", { name: "Create Workspace" }));
    await user.type(screen.getByLabelText("Workspace name"), workspaceName);
    await user.click(screen.getByRole("button", { name: "Create" }));

    // 3. ASSERT
    expect(mockCreateWorkspace).toHaveBeenCalledWith({ name: workspaceName });
  });

  it("opens a PDF from a single click using its file ID", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const file = buildWorkspaceFileNode({
      id: faker.string.uuid(),
      name: `${faker.word.noun()}.PDF`,
    });
    const folder = buildWorkspaceFolderNode({ children: [file] });

    // 2. ACT
    render(<DirectoryViewer workspaces={[buildWorkspace({ children: [folder] })]} />);
    await user.click(screen.getByRole("button", { name: `Open ${file.name}` }));

    // 3. ASSERT
    expect(mockLoadPdf).toHaveBeenCalledWith(file.id);
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent(file.name));
  });

  it("saves the last successfully loaded PDF without requesting it again", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const file = buildWorkspaceFileNode({
      name: `${faker.word.noun()}.pdf`,
    });
    const bytes = new Uint8Array([37, 80, 68, 70, 45]);
    mockLoadPdf.mockResolvedValue(bytes);

    // 2. ACT
    render(
      <DirectoryViewer
        workspaces={[buildWorkspace({ children: [buildWorkspaceFolderNode({ children: [file] })] })]}
      />,
    );
    await user.click(screen.getByRole("button", { name: `Open ${file.name}` }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Download" }));

    // 3. ASSERT
    expect(mockLoadPdf).toHaveBeenCalledTimes(1);
    expect(mockSavePdf).toHaveBeenCalledWith({ name: file.name, data: bytes });
  });

  it("toggles an extensionless document folder without opening its PDF", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const file = buildWorkspaceFileNode({
      id: faker.string.uuid(),
      name: `${faker.word.noun()}.pdf`,
    });
    const documentFolder = buildWorkspaceDocumentFolder(
      file,
      { id: faker.string.uuid() },
    );
    const filesFolder = buildWorkspaceFolderNode({
      name: "Files",
      children: [documentFolder],
    });

    // 2. ACT
    render(<DirectoryViewer workspaces={[buildWorkspace({ children: [filesFolder] })]} />);
    await user.click(screen.getByText(documentFolder.name));

    // 3. ASSERT
    expect(
      screen.queryByRole("button", { name: `Open ${documentFolder.name}` }),
    ).not.toBeInTheDocument();
    expect(mockLoadPdf).not.toHaveBeenCalled();
    expect(mockNodeToggle).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: `Open ${file.name}` }));
    expect(mockLoadPdf).toHaveBeenCalledTimes(1);
    expect(mockLoadPdf).toHaveBeenCalledWith(file.id);
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveTextContent(file.name),
    );
    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(mockSavePdf).toHaveBeenCalledWith({
      name: file.name,
      data: expect.any(Uint8Array),
    });
  });

  it("uses distinct tree identities when a folder and file share an ID", () => {
    // 1. ARRANGE
    const sharedId = faker.string.uuid();
    const file = buildWorkspaceFileNode({ id: sharedId });
    const documentFolder = buildWorkspaceDocumentFolder(file, { id: sharedId });

    // 2. ACT
    render(
      <DirectoryViewer
        workspaces={[buildWorkspace({ children: [documentFolder] })]}
      />,
    );

    // 3. ASSERT
    expect(mockTreeNodeIds).toEqual(
      expect.arrayContaining([`folder:${sharedId}`, `file:${sharedId}`]),
    );
    expect(new Set(mockTreeNodeIds).size).toBe(mockTreeNodeIds.length);
  });

  it("activates the PDF child with Enter and Space once each", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const file = buildWorkspaceFileNode({ name: `${faker.word.noun()}.pdf` });
    const documentFolder = buildWorkspaceDocumentFolder(file);
    const filesFolder = buildWorkspaceFolderNode({
      name: "Files",
      children: [documentFolder],
    });

    // 2. ACT
    render(<DirectoryViewer workspaces={[buildWorkspace({ children: [filesFolder] })]} />);
    const pdfRow = screen.getByRole("button", { name: `Open ${file.name}` });
    pdfRow.focus();
    await user.keyboard("{Enter}");
    pdfRow.focus();
    await user.keyboard(" ");

    // 3. ASSERT
    expect(mockLoadPdf).toHaveBeenCalledTimes(2);
    expect(mockLoadPdf).toHaveBeenNthCalledWith(1, file.id);
    expect(mockLoadPdf).toHaveBeenNthCalledWith(2, file.id);
  });

  it("opens a PDF with Enter and ignores non-PDF or missing-document-ID files", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const pdfFile = buildWorkspaceFileNode({ name: `${faker.word.noun()}.pdf` });
    const textFile = buildWorkspaceFileNode({
      name: `${faker.word.noun()}.txt`,
    });
    const missingIdFile = buildWorkspaceFileNode({
      name: `${faker.word.noun()}.pdf`,
      id: "",
    });
    const folder = buildWorkspaceFolderNode({
      children: [pdfFile, textFile, missingIdFile],
    });

    // 2. ACT
    render(<DirectoryViewer workspaces={[buildWorkspace({ children: [folder] })]} />);
    const pdfButton = screen.getByRole("button", { name: `Open ${pdfFile.name}` });
    pdfButton.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByText(textFile.name));
    await user.click(screen.getByText(missingIdFile.name));

    // 3. ASSERT
    expect(mockLoadPdf).toHaveBeenCalledTimes(1);
    expect(mockLoadPdf).toHaveBeenCalledWith(pdfFile.id);
    expect(screen.queryByRole("button", { name: `Open ${textFile.name}` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Open ${missingIdFile.name}` })).not.toBeInTheDocument();
  });

  it("opens a PDF with Space exactly once", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const file = buildWorkspaceFileNode({
      name: `${faker.word.noun()}.pdf`,
      id: faker.string.uuid(),
    });
    const folder = buildWorkspaceFolderNode({ children: [file] });

    // 2. ACT
    render(<DirectoryViewer workspaces={[buildWorkspace({ children: [folder] })]} />);
    const pdfButton = screen.getByRole("button", { name: `Open ${file.name}` });
    pdfButton.focus();
    await user.keyboard(" ");

    // 3. ASSERT
    expect(mockLoadPdf).toHaveBeenCalledTimes(1);
    expect(mockLoadPdf).toHaveBeenCalledWith(file.id);
  });

  it("toggles folders through tree activation", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const folder = buildWorkspaceFolderNode();

    // 2. ACT
    render(<DirectoryViewer workspaces={[buildWorkspace({ children: [folder] })]} />);
    await user.click(screen.getByText(folder.name));

    // 3. ASSERT
    expect(mockNodeToggle).toHaveBeenCalledTimes(1);
    expect(mockLoadPdf).not.toHaveBeenCalled();
  });

  it("expands document folders and opens the original PDF", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const documentId = faker.string.uuid();
    const originalPdfId = faker.string.uuid();
    const originalPdf = buildWorkspaceFileNode({
      id: originalPdfId,
      name: `${faker.word.noun()}.pdf`,
    });
    const markdown = buildWorkspaceFileNode({
      name: `${faker.word.noun()}.md`,
      role: "translation",
    });
    const pageImage = buildWorkspaceFileNode({
      name: `${faker.word.noun()}.png`,
      role: "page",
    });
    const originalFolder = buildWorkspaceFolderNode({
      id: `generated:${documentId}:original-file`,
      name: "Original file",
      children: [originalPdf],
    });
    const englishFolder = buildWorkspaceFolderNode({
      id: `generated:${documentId}:translation:english`,
      name: "English",
      children: [markdown],
    });
    const translationFolder = buildWorkspaceFolderNode({
      id: `generated:${documentId}:translations`,
      name: "Translation",
      children: [englishFolder],
    });
    const pagesFolder = buildWorkspaceFolderNode({
      id: `generated:${documentId}:pages`,
      name: "Pages",
      children: [pageImage],
    });
    const documentFolder = buildWorkspaceFolderNode({
      id: documentId,
      name: faker.word.words(2),
      children: [originalFolder, translationFolder, pagesFolder],
    });
    const filesFolder = buildWorkspaceFolderNode({
      name: "Files",
      children: [documentFolder],
    });

    // 2. ACT
    render(<DirectoryViewer workspaces={[buildWorkspace({ children: [filesFolder] })]} />);
    await user.click(screen.getByText("Original file"));
    await user.click(screen.getByText("Translation"));
    await user.click(screen.getByText("English"));
    await user.click(screen.getByText(markdown.name));
    await user.click(screen.getByText("Pages"));
    await user.click(screen.getByText(pageImage.name));
    expect(mockLoadPdf).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: `Open ${originalPdf.name}` }),
    );

    // 3. ASSERT
    expect(mockNodeToggle).toHaveBeenCalledWith(`folder:${originalFolder.id}`);
    expect(mockNodeToggle).toHaveBeenCalledWith(`folder:${translationFolder.id}`);
    expect(mockNodeToggle).toHaveBeenCalledWith(`folder:${englishFolder.id}`);
    expect(mockNodeToggle).toHaveBeenCalledWith(`folder:${pagesFolder.id}`);
    expect(mockLoadPdf).toHaveBeenCalledWith(originalPdfId);
    expect(mockLoadPdf).not.toHaveBeenCalledWith(documentId);
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveTextContent(originalPdf.name),
    );
  });

  it("requests a converted PDF with its own file ID", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const parentDocumentId = faker.string.uuid();
    const convertedPdf = buildWorkspaceFileNode({
      id: faker.string.uuid(),
      name: `${faker.word.noun()}.pdf`,
      role: "converted_pdf",
    });
    const originalDocx = buildWorkspaceFileNode({
      id: parentDocumentId,
      name: `${faker.word.noun()}.docx`,
      role: "original",
    });
    const originalFolder = buildWorkspaceFolderNode({
      name: "Original file",
      children: [originalDocx, convertedPdf],
    });
    const documentFolder = buildWorkspaceFolderNode({
      name: faker.word.words(2),
      children: [
        originalFolder,
        buildWorkspaceFolderNode({ name: "Translation" }),
        buildWorkspaceFolderNode({ name: "Pages" }),
      ],
    });

    // 2. ACT
    render(
      <DirectoryViewer
        workspaces={[buildWorkspace({ children: [documentFolder] })]}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: `Open ${convertedPdf.name}` }),
    );

    // 3. ASSERT
    expect(convertedPdf.id).not.toBe(parentDocumentId);
    expect(mockLoadPdf).toHaveBeenCalledWith(convertedPdf.id);
    expect(mockLoadPdf).not.toHaveBeenCalledWith(parentDocumentId);
  });

  it("keeps the last PDF visible when a replacement request fails", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const firstFile = buildWorkspaceFileNode({
      name: `${faker.string.alphanumeric(8)}.pdf`,
    });
    const secondFile = buildWorkspaceFileNode({
      name: `${faker.string.alphanumeric(8)}.pdf`,
    });
    const folder = buildWorkspaceFolderNode({ children: [firstFile, secondFile] });
    mockLoadPdf
      .mockResolvedValueOnce(new Uint8Array([37, 80, 68, 70, 45]))
      .mockRejectedValueOnce(new Error(faker.lorem.sentence()));

    // 2. ACT
    render(<DirectoryViewer workspaces={[buildWorkspace({ children: [folder] })]} />);
    await user.click(screen.getByRole("button", { name: `Open ${firstFile.name}` }));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent(firstFile.name));
    await user.click(screen.getByRole("button", { name: `Open ${secondFile.name}` }));

    // 3. ASSERT
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent(firstFile.name));
    expect(screen.getByRole("dialog")).toHaveTextContent("PDF failed");
  });

  it("allows only the newest request to replace the viewer", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const firstFile = buildWorkspaceFileNode({ name: `${faker.word.noun()}.pdf` });
    const secondFile = buildWorkspaceFileNode({ name: `${faker.word.noun()}.pdf` });
    const folder = buildWorkspaceFolderNode({ children: [firstFile, secondFile] });
    const requests = new Map<string, (bytes: Uint8Array) => void>();
    mockLoadPdf.mockImplementation(
      (documentId: string) =>
        new Promise<Uint8Array>((resolve) => requests.set(documentId, resolve)),
    );

    // 2. ACT
    render(<DirectoryViewer workspaces={[buildWorkspace({ children: [folder] })]} />);
    await user.click(screen.getByRole("button", { name: `Open ${firstFile.name}` }));
    await user.click(screen.getByRole("button", { name: `Open ${secondFile.name}` }));
    requests.get(firstFile.id)?.(new Uint8Array([37, 80, 68, 70, 49]));
    requests.get(secondFile.id)?.(new Uint8Array([37, 80, 68, 70, 50]));

    // 3. ASSERT
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent(secondFile.name));
    expect(screen.getByRole("dialog")).not.toHaveTextContent(firstFile.name);
  });
});
