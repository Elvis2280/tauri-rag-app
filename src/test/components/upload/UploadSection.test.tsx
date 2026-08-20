import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadSection from "@/components/upload/UploadSection";
import { useGlobalContext } from "@/context/GlobalContext";
import useFileUpload from "@/hooks/useFileUpload";
import useWorkspaceList from "@/hooks/useWorkspaceList";
import { useFileContext } from "@/context/FileContext";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";

vi.mock("@/hooks/useFileUpload", () => ({ default: vi.fn() }));
vi.mock("@/hooks/useWorkspaceList", () => ({ default: vi.fn() }));
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
