import type { QueryClient } from "@tanstack/react-query";
import { useChatStore } from "@/context/chatStore";
import { useGlobalContext } from "@/context/GlobalContext";
import { WORKSPACE_STORAGE_KEY } from "@/constants/workspace";
import { HISTORY_STORAGE_KEY } from "@/constants/history";
import { useHistory } from "@/context/HistoryContext";

export async function resetEnvironmentData(queryClient: QueryClient): Promise<void> {
  // Stop old requests before they can restore data from the previous environment.
  await queryClient.cancelQueries();
  queryClient.removeQueries();
  useGlobalContext.setState({ workspaces: [], selectedWorkspace: null });
  useHistory.getState().clearEntries();
  useChatStore.getState().clearMessages();
  useChatStore.persist.clearStorage();
  window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
}
