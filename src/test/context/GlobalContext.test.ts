import { beforeEach, describe, expect, it } from "vitest";
import { useGlobalContext } from "@/context/GlobalContext";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";

describe("useGlobalContext", () => {
  beforeEach(() => {
    useGlobalContext.setState({ workspaces: [] });
  });

  it("starts with an empty workspace list", () => {
    // 1. ARRANGE

    // 2. ACT
    const workspaces = useGlobalContext.getState().workspaces;

    // 3. ASSERT
    expect(workspaces).toEqual([]);
  });

  it("appends a workspace without mutating the existing list", () => {
    // 1. ARRANGE
    const firstWorkspace = buildWorkspaceListItem();
    const secondWorkspace = buildWorkspaceListItem();
    useGlobalContext.getState().loadWorkspaceList([firstWorkspace]);
    const previousList = useGlobalContext.getState().workspaces;

    // 2. ACT
    useGlobalContext.getState().updateWorkspaceList(secondWorkspace);

    // 3. ASSERT
    expect(useGlobalContext.getState().workspaces).toEqual([
      firstWorkspace,
      secondWorkspace,
    ]);
    expect(useGlobalContext.getState().workspaces).not.toBe(previousList);
  });

  it("replaces the complete workspace list", () => {
    // 1. ARRANGE
    const initialWorkspace = buildWorkspaceListItem();
    const replacementWorkspaces = [buildWorkspaceListItem(), buildWorkspaceListItem()];
    useGlobalContext.getState().loadWorkspaceList([initialWorkspace]);

    // 2. ACT
    useGlobalContext.getState().loadWorkspaceList(replacementWorkspaces);

    // 3. ASSERT
    expect(useGlobalContext.getState().workspaces).toEqual(replacementWorkspaces);
  });
});
