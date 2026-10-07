import { beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadSection from "@/components/upload/UploadSection";
import { ACCEPTED_FILE_TYPES } from "@/constants/upload";
import { useGlobalContext } from "@/context/GlobalContext";
import useFileUpload from "@/hooks/useFileUpload";
import { useWorkspaceList, useWorkspaceTree } from "@/hooks/useWorkspace";
import { useFileContext } from "@/context/FileContext";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";
import { buildWorkspace, buildWorkspaceFolderNode } from "@/test/factories/workspace.factory";
import type { FileUploadType } from "@/types/FileTypes";

vi.mock("@/hooks/useFileUpload", () => ({ default: vi.fn() }));
vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspaceList: vi.fn(),
  useWorkspaceTree: vi.fn(),
}));
vi.mock("@/components/upload/UploadModal", () => ({
  default: ({
    workspaces,
    onWorkspaceChange,
    onUpload,
    isOpen,
    files,
    canUpload,
    duplicateFileNames,
    duplicateWorkspaceName,
    onUploadAnyway,
    onCancelDuplicateUpload,
  }: {
    isOpen: boolean;
    workspaces: Array<{ id: string; name: string }>;
    onWorkspaceChange: (value: string) => void;
    onUpload: () => void;
    files: FileUploadType[];
    canUpload: boolean;
    duplicateFileNames: string[];
    duplicateWorkspaceName: string;
    onUploadAnyway: () => void;
    onCancelDuplicateUpload: () => void;
  }) => (
    <div>
      <span data-testid="upload-modal-state">{isOpen ? "open" : "closed"}</span>
      {workspaces.map((workspace) => (
        <span key={workspace.id}>{workspace.name}</span>
      ))}
      <span data-testid="selected-file-count">{files.length}</span>
      {duplicateFileNames.length > 0 && (
        <div role="alertdialog">
          <span>{duplicateWorkspaceName}</span>
          {duplicateFileNames.map((fileName) => (
            <span key={fileName}>{fileName}</span>
          ))}
          <button onClick={onCancelDuplicateUpload}>Cancel</button>
          <button onClick={onUploadAnyway}>Upload anyway</button>
        </div>
      )}
      <button onClick={() => onWorkspaceChange(workspaces[0]?.id ?? "")}>
        Choose workspace
      </button>
      <button disabled={!canUpload} onClick={onUpload}>
        Upload selected files
      </button>
    </div>
  ),
}));

const mockedUseFileUpload = vi.mocked(useFileUpload);
const mockedUseWorkspaceList = vi.mocked(useWorkspaceList);
const mockedUseWorkspaceTree = vi.mocked(useWorkspaceTree);
const mockedUploadFiles = vi.fn().mockResolvedValue([]);

describe("UploadSection", () => {
  beforeEach(() => {
    const workspaces = [buildWorkspaceListItem()];
    useGlobalContext.setState({ workspaces });
    useFileContext.setState({ files: [] });
    mockedUploadFiles.mockReset();
    mockedUploadFiles.mockResolvedValue([]);
    mockedUseFileUpload.mockReturnValue({
      uploadFiles: mockedUploadFiles,
      loading: false,
    });
    mockedUseWorkspaceList.mockReturnValue({
      data: workspaces,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockedUseWorkspaceTree.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders workspace options from the shared global list", () => {
    // 1. ARRANGE
    const workspace = useGlobalContext.getState().workspaces[0];

    // 2. ACT
    render(<UploadSection />);

    // 3. ASSERT
    expect(screen.getByText(workspace.name)).toBeInTheDocument();
  });

  it("configures the backend-supported upload file types", () => {
    // 1. ARRANGE
    const expectedFileTypes = {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
        ".pptx",
      ],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
      "application/vnd.oasis.opendocument.presentation": [".odp"],
      "text/csv": [".csv"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    };

    // 2. ACT
    const configuredFileTypes = ACCEPTED_FILE_TYPES;

    // 3. ASSERT
    expect(configuredFileTypes).toEqual(expectedFileTypes);
  });

  it("renders the upload icon with the neon sunlight glow", () => {
    // 1. ARRANGE
    const { container } = render(<UploadSection />);

    // 2. ACT
    const glow = container.querySelector(".neon-sun-glow");

    // 3. ASSERT
    expect(glow).toBeInTheDocument();
  });

  it("uploads using the selected shared workspace ID", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = useGlobalContext.getState().workspaces[0];
    render(<UploadSection />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Choose workspace" }));
    await user.click(screen.getByRole("button", { name: "Upload selected files" }));

    // 3. ASSERT
    await waitFor(() =>
      expect(mockedUploadFiles).toHaveBeenCalledWith({
        files: [],
        workspaceId: workspace.id,
      }),
    );
  });

  it("continues without a warning when the selected file is new to the workspace", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const fileName = `${faker.string.alpha({ length: 8, casing: "lower" })}.pdf`;
    const file = new File([faker.lorem.word()], fileName, {
      type: "application/pdf",
    });
    const { container } = render(<UploadSection />);
    const fileInput = container.querySelector('input[type="file"]');

    // 2. ACT
    await user.upload(fileInput as HTMLInputElement, file);
    await user.click(screen.getByRole("button", { name: "Choose workspace" }));

    // 3. ASSERT
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload selected files" }),
    ).toBeEnabled();
  });

  it("warns once for duplicate files and continues after uploading anyway", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = useGlobalContext.getState().workspaces[0];
    const fileName = `${faker.string.alpha({ length: 8, casing: "lower" })}.pdf`;
    const file = new File([faker.lorem.word()], fileName, {
      type: "application/pdf",
    });
    mockedUseWorkspaceTree.mockReturnValue({
      data: [
        buildWorkspace({
          id: workspace.id,
          name: workspace.name,
          children: [
            buildWorkspaceFolderNode({
              children: [
                {
                  type: "file",
                  id: faker.string.uuid(),
                  name: fileName,
                  role: "original",
                },
              ],
            }),
          ],
        }),
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    const { container } = render(<UploadSection />);
    const fileInput = container.querySelector('input[type="file"]');

    // 2. ACT
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput as HTMLInputElement, file);
    await user.click(screen.getByRole("button", { name: "Choose workspace" }));

    // 3. ASSERT
    expect(screen.getByRole("alertdialog")).toHaveTextContent(fileName);
    expect(
      screen.getByRole("button", { name: "Upload anyway" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Upload selected files",
        hidden: true,
      }),
    ).toBeDisabled();

    // 4. ACT
    await user.click(screen.getByRole("button", { name: "Upload anyway" }));
    await user.click(screen.getByRole("button", { name: "Upload selected files" }));

    // 5. ASSERT
    await waitFor(() =>
      expect(mockedUploadFiles).toHaveBeenCalledWith({
        files: [file],
        workspaceId: workspace.id,
      }),
    );
  });

  it("clears the selected files and closes the flow when a duplicate is cancelled", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = useGlobalContext.getState().workspaces[0];
    const fileName = `${faker.string.alpha({ length: 8, casing: "lower" })}.pdf`;
    const file = new File([faker.lorem.word()], fileName, {
      type: "application/pdf",
    });
    mockedUseWorkspaceTree.mockReturnValue({
      data: [
        buildWorkspace({
          id: workspace.id,
          name: workspace.name,
          children: [
            buildWorkspaceFolderNode({
              children: [
                {
                  type: "file",
                  id: faker.string.uuid(),
                  name: fileName,
                  role: "original",
                },
              ],
            }),
          ],
        }),
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    const { container } = render(<UploadSection />);
    const fileInput = container.querySelector('input[type="file"]');

    // 2. ACT
    await user.upload(fileInput as HTMLInputElement, file);
    await user.click(screen.getByRole("button", { name: "Choose workspace" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // 3. ASSERT
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("selected-file-count")).toHaveTextContent("0");
    expect(screen.getByTestId("upload-modal-state")).toHaveTextContent("closed");
    expect(mockedUploadFiles).not.toHaveBeenCalled();
  });
});
