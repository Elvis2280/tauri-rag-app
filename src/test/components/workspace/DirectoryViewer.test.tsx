import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import type { CSSProperties, ReactNode } from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DirectoryViewer from "@/components/workspace/DirectoryViewer";
import {
  buildWorkspace,
  buildWorkspaceFolderNode,
  buildWorkspaceListItem,
} from "@/test/factories/workspace.factory";
import type { WorkspaceTreeItem } from "@/types/WorkspaceTypes";

const mockTreeHeight = vi.fn();
const mockNodeSelect = vi.fn();
const mockDisableWorkspace = vi.fn();
const mockCreateWorkspace = vi.fn();

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

vi.mock("react-arborist", () => ({
  Tree: ({
    data,
    height,
    children,
  }: {
    data: WorkspaceTreeItem[];
    height: number;
    children: (props: {
      node: {
        data: WorkspaceTreeItem;
        isOpen: boolean;
        isSelected: boolean;
        select: () => void;
        toggle: () => void;
      };
      style: CSSProperties;
    }) => ReactNode;
  }) => {
    mockTreeHeight(height);

    const renderNode = (item: WorkspaceTreeItem): ReactNode => (
      <div key={item.id}>
        {children({
          node: {
            data: item,
            isOpen: false,
            isSelected: false,
            select: mockNodeSelect,
            toggle: vi.fn(),
          },
          style: {},
        })}
        {"children" in item ? item.children.map(renderNode) : null}
      </div>
    );

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
    mockDisableWorkspace.mockReset();
    mockCreateWorkspace.mockReset();
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
});
