import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import apiRag from "@/lib/axios";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { WORKSPACE_ENDPOINTS } from "@/lib/api/endpoints";
import { useGlobalContext } from "@/context/GlobalContext";
import type {
  ApiWorkspaceListResponse,
  WorkspaceListItem,
} from "@/types/WorkspaceTypes";

export const workspaceListQueryKey = ["workspaces", "list"] as const;

async function fetchWorkspaceList(): Promise<ApiWorkspaceListResponse> {
  const response = await apiRag.get<ApiWorkspaceListResponse>(
    WORKSPACE_ENDPOINTS.list,
  );

  return response.data;
}

type UseWorkspaceListResult = {
  data: WorkspaceListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

type UseWorkspaceListOptions = {
  showErrorToast?: boolean;
};

const WORKSPACE_LIST_ERROR = "Failed to load workspaces";

export default function useWorkspaceList(
  { showErrorToast = true }: UseWorkspaceListOptions = {},
): UseWorkspaceListResult {
  const query = useQuery({
    queryKey: workspaceListQueryKey,
    queryFn: fetchWorkspaceList,
  });
  const workspaces = useGlobalContext((state) => state.workspaces);
  const loadWorkspaceList = useGlobalContext(
    (state) => state.loadWorkspaceList,
  );

  useEffect(() => {
    if (query.data) {
      loadWorkspaceList(query.data);
    }
  }, [loadWorkspaceList, query.data]);

  useEffect(() => {
    if (showErrorToast && query.error) {
      const message = extractApiErrorMessage(query.error, WORKSPACE_LIST_ERROR);
      toast.error(WORKSPACE_LIST_ERROR, { description: message });
    }
  }, [query.error, showErrorToast]);

  return {
    data: workspaces,
    loading: query.isLoading,
    error: query.error
      ? extractApiErrorMessage(query.error, WORKSPACE_LIST_ERROR)
      : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
