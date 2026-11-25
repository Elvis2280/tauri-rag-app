import { beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadModal from "@/components/upload/UploadModal";
import { useFileContext } from "@/context/FileContext";
import { useGlobalContext } from "@/context/GlobalContext";
import useFileUpload from "@/hooks/useFileUpload";
import { useWorkspaceList, useWorkspaceTree } from "@/hooks/useWorkspace";
import { buildWorkspace, buildWorkspaceFolderNode, buildWorkspaceListItem } from "@/test/factories/workspace.factory";
import { FILE_STATUS } from "@/types/FileTypes";

vi.mock("@/hooks/useFileUpload", () => ({ default: vi.fn() }));
vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspaceList: vi.fn(),
  useWorkspaceTree: vi.fn(),
}));
vi.mock("@/components/upload/UploadWorkspaceSelect", () => ({
  default: ({ workspaces, value, onValueChange }: {
    workspaces: Array<{ id: string; name: string }>;
    value: string;
    onValueChange: (id: string) => void;
  }) => (
    <select aria-label="Workspace" value={value} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">Select a workspace</option>
      {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
    </select>
  ),
}));

const mockUploadFiles = vi.fn<ReturnType<typeof useFileUpload>["uploadFiles"]>();
const mockedUseFileUpload = vi.mocked(useFileUpload);
const mockedUseWorkspaceList = vi.mocked(useWorkspaceList);
const mockedUseWorkspaceTree = vi.mocked(useWorkspaceTree);

describe("UploadModal", () => {
  beforeEach(() => {
    const workspace = buildWorkspaceListItem();
    useGlobalContext.setState({ workspaces: [workspace] });
    useFileContext.setState({ files: [] });
    mockUploadFiles.mockReset();
    mockUploadFiles.mockResolvedValue([]);
    mockedUseFileUpload.mockReturnValue({ uploadFiles: mockUploadFiles, loading: false });
    mockedUseWorkspaceList.mockReturnValue({ data: [workspace], loading: false, error: null, refetch: vi.fn() });
    mockedUseWorkspaceTree.mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() });
  });

  it("shows child components within the modal and submits a regular upload", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = useGlobalContext.getState().workspaces[0];
    const file = new File([faker.lorem.word()], faker.system.commonFileName("pdf"), { type: "application/pdf" });
    const fileId = faker.string.uuid();
    useFileContext.setState({ files: [{ id: fileId, file, status: FILE_STATUS.FILE_UPLOADED }] });
    mockUploadFiles.mockResolvedValue([{ fileId, response: {
      document_id: faker.string.uuid(), task_id: faker.string.uuid(), workspace_id: workspace.id,
      original_filename: file.name, mime_type: file.type, stored_filename: faker.system.fileName(),
      page_count: faker.number.int({ min: 1, max: 100 }), status: FILE_STATUS.FILE_UPLOADED, message: faker.lorem.sentence(),
    } }]);

    // 2. ACT
    render(<UploadModal open onClose={vi.fn()} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Workspace" }), workspace.id);
    await user.click(screen.getByRole("button", { name: "Upload" }));

    // 3. ASSERT
    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledWith({
      files: [{ id: fileId, file, status: FILE_STATUS.FILE_UPLOADED }],
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      replacements: {},
    }));
  });

  it("replaces the selected existing document when upload anyway is confirmed", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = buildWorkspaceListItem();
    const documentId = faker.string.uuid();
    const uploadId = faker.string.uuid();
    const fileName = faker.system.commonFileName("pdf");
    const file = new File([faker.lorem.word()], fileName, { type: "application/pdf" });
    const selectedFile = { id: uploadId, file, status: FILE_STATUS.FILE_UPLOADED };
    const response = {
      document_id: documentId, task_id: faker.string.uuid(), workspace_id: workspace.id,
      original_filename: file.name, mime_type: file.type, stored_filename: faker.system.fileName(),
      page_count: faker.number.int({ min: 1, max: 100 }), status: FILE_STATUS.FILE_UPLOADED, message: faker.lorem.sentence(),
    };
    useGlobalContext.setState({ workspaces: [workspace] });
    useFileContext.setState({ files: [selectedFile] });
    mockedUseWorkspaceTree.mockReturnValue({
      data: [buildWorkspace({ id: workspace.id, name: workspace.name, children: [
        buildWorkspaceFolderNode({ children: [{ type: "file", id: documentId, name: fileName, role: "original" }] }),
      ] })], loading: false, error: null, refetch: vi.fn(),
    });
    mockUploadFiles.mockResolvedValue([{ fileId: uploadId, response }]);

    // 2. ACT
    render(<UploadModal open onClose={vi.fn()} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Workspace" }), workspace.id);
    await user.click(screen.getByRole("button", { name: "Upload anyway" }));

    // 3. ASSERT
    await waitFor(() => expect(mockUploadFiles).toHaveBeenCalledWith({
      files: [selectedFile],
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      replacements: { [uploadId]: documentId },
    }));
  });
});
