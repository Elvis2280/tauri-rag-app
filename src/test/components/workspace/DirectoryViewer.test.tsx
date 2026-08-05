import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import DirectoryViewer from "@/components/workspace/DirectoryViewer";
import { buildWorkspace } from "@/test/factories/workspace.factory";

const mockTreeHeight = vi.fn();

vi.mock("react-arborist", () => ({
  Tree: ({ height }: { height: number }) => {
    mockTreeHeight(height);
    return <div data-testid="tree" style={{ height }} />;
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
});
