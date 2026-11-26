import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { useGlobalContext } from "@/context/GlobalContext";
import { useHistory } from "@/context/HistoryContext";
import { HISTORY_STORAGE_KEY } from "@/constants/history";
import { WORKSPACE_STORAGE_KEY } from "@/constants/workspace";
import { resetEnvironmentData } from "@/lib/resetEnvironmentData";
import { buildHistoryEntry } from "@/test/factories/history.factory";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";

describe("resetEnvironmentData", () => {
  beforeEach(() => {
    localStorage.clear();
    useHistory.setState({ entries: [], cancellations: {}, cancellationGeneration: 0 });
    useGlobalContext.setState({ workspaces: [], selectedWorkspace: null });
  });

  it("clears cached history, live progress, workspace state, and legacy history storage", async () => {
    // 1. ARRANGE
    const queryClient = new QueryClient();
    const workspace = buildWorkspaceListItem();
    const entry = buildHistoryEntry();
    queryClient.setQueryData(["history", "list", { status: "active" }], {
      pages: [],
      pageParams: [],
    });
    useHistory.setState({ entries: [entry] });
    useGlobalContext.setState({ workspaces: [workspace], selectedWorkspace: workspace.id });
    localStorage.setItem(HISTORY_STORAGE_KEY, "legacy history");
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace.id);

    // 2. ACT
    await resetEnvironmentData(queryClient);

    // 3. ASSERT
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useHistory.getState().entries).toEqual([]);
    expect(useGlobalContext.getState().workspaces).toEqual([]);
    expect(useGlobalContext.getState().selectedWorkspace).toBeNull();
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
  });
});
