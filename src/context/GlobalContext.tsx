import { create } from "zustand";
import type { WorkspaceListItem } from "@/types/WorkspaceTypes";

type GlobalState = {
  workspaces: WorkspaceListItem[];
  selectedWorkspace: string | null
};

type GlobalActions = {
  updateWorkspaceList: (workspace: WorkspaceListItem) => void;
  loadWorkspaceList: (workspaces: WorkspaceListItem[]) => void;
  setSelectedWorkspace: (workspace: string) => void;
};

export const useGlobalContext = create<GlobalState & GlobalActions>()((set) => ({
  workspaces: [],
  selectedWorkspace: null,
  updateWorkspaceList: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  loadWorkspaceList: (workspaces) => set({ workspaces }),
  setSelectedWorkspace: (workspace) => set({ selectedWorkspace: workspace }),
}));
