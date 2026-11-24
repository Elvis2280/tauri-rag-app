import type { QueryClient } from "@tanstack/react-query";
import { useChatStore } from "@/context/chatStore";
import { useGlobalContext } from "@/context/GlobalContext";
import { WORKSPACE_STORAGE_KEY } from "@/constants/workspace";

export async function resetEnvironmentData(queryClient: QueryClient): Promise<void> {
  // Stop old requests before they can restore data from the previous environment.
  await queryClient.cancelQueries();
  queryClient.removeQueries();
  useGlobalContext.setState({ workspaces: [], selectedWorkspace: null });
  useChatStore.getState().clearMessages();
  useChatStore.persist.clearStorage();
  window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
}
