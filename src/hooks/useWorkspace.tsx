import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGlobalContext } from "@/context/GlobalContext";
import apiRag, { type ApiError } from "@/lib/axios";
import { WORKSPACE_ENDPOINTS } from "@/lib/api/endpoints";
import { extractApiErrorMessage } from "@/lib/api/errors";
import {
  mapTreeResponseToUI,
  type ApiWorkspaceListResponse,
  type ApiWorkspaceTreeResponse,
  type CreateWorkspaceParams,
  type CreateWorkspaceResponse,
  type DisableWorkspaceErrorResponse,
  type DisableWorkspaceResponse,
  type WorkspaceValidationErrorResponse,
  type Workspace,
  type WorkspaceListItem,
} from "@/types/WorkspaceTypes";

const workspaceKeyRoot = ["workspaces"] as const;

export const workspaceKeys = {
  all: workspaceKeyRoot,
  list: () => [...workspaceKeyRoot, "list"] as const,
  tree: () => [...workspaceKeyRoot, "tree"] as const,
};

const WORKSPACE_LIST_ERROR = "Failed to load workspaces";
const WORKSPACE_TREE_ERROR = "Failed to load workspace tree";
const CREATE_WORKSPACE_ERROR = "Failed to create workspace";
const DISABLE_WORKSPACE_ERROR = "Failed to disable workspace";

type CreateWorkspaceApiError = ApiError & { response: ApiError["response"] & { data: WorkspaceValidationErrorResponse } };
type DisableWorkspaceApiError = ApiError & { response: ApiError["response"] & { data: DisableWorkspaceErrorResponse } };

type WorkspaceQueryResult<TData> = {
  data: TData;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

type UseWorkspaceListOptions = {
  showErrorToast?: boolean;
};

async function fetchWorkspaceList(): Promise<ApiWorkspaceListResponse> {
  const response = await apiRag.get<ApiWorkspaceListResponse>(
    WORKSPACE_ENDPOINTS.list,
  );

  return response.data;
}

async function fetchWorkspaceTree(): Promise<Workspace[]> {
  const response = await apiRag.get<ApiWorkspaceTreeResponse>(
    WORKSPACE_ENDPOINTS.tree,
  );

  return mapTreeResponseToUI(response.data).workspaces;
}

async function postDisableWorkspace(
  workspaceId: string,
): Promise<DisableWorkspaceResponse> {
  const response = await apiRag.post<DisableWorkspaceResponse>(
    WORKSPACE_ENDPOINTS.disable(workspaceId),
  );

  return response.data;
}

async function postCreateWorkspace(
  params: CreateWorkspaceParams,
): Promise<CreateWorkspaceResponse> {
  const response = await apiRag.post<CreateWorkspaceResponse>(
    WORKSPACE_ENDPOINTS.create,
    params,
  );

  return response.data;
}

function useWorkspaceQueryErrorToast(
  error: unknown,
  fallback: string,
  enabled = true,
) {
  useEffect(() => {
    if (enabled && error) {
      toast.error(fallback, {
        description: extractApiErrorMessage(error, fallback),
      });
    }
  }, [enabled, error, fallback]);
}

function getDisableWorkspaceErrorMessage(error: DisableWorkspaceApiError) {
  if (error.response?.status === 422) {
    return extractApiErrorMessage(error, DISABLE_WORKSPACE_ERROR);
  }

  return DISABLE_WORKSPACE_ERROR;
}

function getCreateWorkspaceErrorMessage(error: CreateWorkspaceApiError) {
  if (error.response?.status === 422) {
    return extractApiErrorMessage(error, CREATE_WORKSPACE_ERROR);
  }

  return CREATE_WORKSPACE_ERROR;
}

export function useWorkspaceList(
  { showErrorToast = true }: UseWorkspaceListOptions = {},
): WorkspaceQueryResult<WorkspaceListItem[]> {
  const query = useQuery({
    queryKey: workspaceKeys.list(),
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

  useWorkspaceQueryErrorToast(
    query.error,
    WORKSPACE_LIST_ERROR,
    showErrorToast,
  );

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

export function useWorkspaceTree(): WorkspaceQueryResult<Workspace[] | null> {
  const query = useQuery({
    queryKey: workspaceKeys.tree(),
    queryFn: fetchWorkspaceTree,
  });

  useWorkspaceQueryErrorToast(query.error, WORKSPACE_TREE_ERROR);

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error
      ? extractApiErrorMessage(query.error, WORKSPACE_TREE_ERROR)
      : null,
    refetch: () => {
      void query.refetch();
    },
  };
}

type UseCreateWorkspaceResult = {
  createWorkspace: (
    params: CreateWorkspaceParams,
  ) => Promise<CreateWorkspaceResponse>;
  isPending: boolean;
  error: string | null;
};

export function useCreateWorkspace(): UseCreateWorkspaceResult {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    CreateWorkspaceResponse,
    CreateWorkspaceApiError,
    CreateWorkspaceParams
  >({
    mutationFn: postCreateWorkspace,
    onSuccess: async (workspace) => {
      toast.success(`Created workspace ${workspace.name}`);
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
    onError: (error) => {
      toast.error(CREATE_WORKSPACE_ERROR, {
        description: getCreateWorkspaceErrorMessage(error),
      });
    },
  });

  const createWorkspace = useCallback(
    (params: CreateWorkspaceParams) => mutation.mutateAsync(params),
    [mutation.mutateAsync],
  );

  return {
    createWorkspace,
    isPending: mutation.isLoading,
    error: mutation.error
      ? getCreateWorkspaceErrorMessage(mutation.error)
      : null,
  };
}

type UseDisableWorkspaceResult = {
  disableWorkspace: (workspaceId: string) => Promise<DisableWorkspaceResponse>;
  isPending: boolean;
  error: string | null;
};

export function useDisableWorkspace(): UseDisableWorkspaceResult {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    DisableWorkspaceResponse,
    DisableWorkspaceApiError,
    string
  >({
    mutationFn: postDisableWorkspace,
    onSuccess: async (response) => {
      toast.success(response.message);
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
    onError: (error) => {
      toast.error(DISABLE_WORKSPACE_ERROR, {
        description: getDisableWorkspaceErrorMessage(error),
      });
    },
  });

  const disableWorkspace = useCallback(
    (workspaceId: string) => mutation.mutateAsync(workspaceId),
    [mutation.mutateAsync],
  );

  return {
    disableWorkspace,
    isPending: mutation.isLoading,
    error: mutation.error
      ? getDisableWorkspaceErrorMessage(mutation.error)
      : null,
  };
}
