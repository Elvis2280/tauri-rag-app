import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import apiRag from "@/lib/axios";
import { WORKSPACE_ENDPOINTS } from "@/lib/api/endpoints";
import { extractApiErrorMessage } from "@/lib/api/errors";
import {
  mapTreeResponseToUI,
  type ApiWorkspaceTreeResponse,
  type Workspace,
} from "@/types/WorkspaceTypes";

export const workspaceTreeQueryKey = ["workspaces", "tree"] as const;

async function fetchWorkspaceTree(): Promise<Workspace[]> {
  const res = await apiRag.get<ApiWorkspaceTreeResponse>(
    WORKSPACE_ENDPOINTS.tree,
  );
  return mapTreeResponseToUI(res.data).workspaces;
}

type UseWorkspaceTreeResult = {
  data: Workspace[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export default function useWorkspaceTree(): UseWorkspaceTreeResult {
  const query = useQuery({
    queryKey: workspaceTreeQueryKey,
    queryFn: fetchWorkspaceTree,
  });

  useEffect(() => {
    if (query.error) {
      const message = extractApiErrorMessage(
        query.error,
        "Failed to load workspace tree",
      );
      toast.error("Failed to load workspace tree", {
        description: message,
      });
    }
  }, [query.error]);

  const error = query.error
    ? extractApiErrorMessage(query.error, "Failed to load workspace tree")
    : null;

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error,
    refetch: () => {
      void query.refetch();
    },
  };
}
