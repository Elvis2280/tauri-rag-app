import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadSection from "@/components/upload/UploadSection";
import { ACCEPTED_FILE_TYPES } from "@/constants/upload";
import { useGlobalContext } from "@/context/GlobalContext";
import useFileUpload from "@/hooks/useFileUpload";
import { useWorkspaceList } from "@/hooks/useWorkspace";
import { useFileContext } from "@/context/FileContext";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";

vi.mock("@/hooks/useFileUpload", () => ({ default: vi.fn() }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspaceList: vi.fn() }));
vi.mock("@/components/upload/UploadModal", () => ({
  default: ({
    workspaces,
    onWorkspaceChange,
    onUpload,
  }: {
    workspaces: Array<{ id: string; name: string }>;
    onWorkspaceChange: (value: string) => void;
    onUpload: () => void;
  }) => (
    <div>
      {workspaces.map((workspace) => (
        <span key={workspace.id}>{workspace.name}</span>
      ))}
      <button onClick={() => onWorkspaceChange(workspaces[0]?.id ?? "")}>
        Choose workspace
      </button>
      <button onClick={onUpload}>Upload selected files</button>
    </div>
  ),
}));

const mockedUseFileUpload = vi.mocked(useFileUpload);
const mockedUseWorkspaceList = vi.mocked(useWorkspaceList);
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
});
