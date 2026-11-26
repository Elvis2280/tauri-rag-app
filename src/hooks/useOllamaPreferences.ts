import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiRag from "@/lib/axios";
import { OLLAMA_ENDPOINTS } from "@/constants/ollama";
import type {
  OllamaPreferences,
  OllamaPreferencesUpdate,
  OllamaStatus,
} from "@/types/OllamaTypes";

export const ollamaKeys = {
  all: ["ollama"] as const,
  preferences: () => [...ollamaKeys.all, "preferences"] as const,
  status: () => [...ollamaKeys.all, "status"] as const,
};

async function fetchOllamaPreferences(): Promise<OllamaPreferences> {
  const response = await apiRag.get<OllamaPreferences>(OLLAMA_ENDPOINTS.preferences);
  return response.data;
}

async function fetchOllamaStatus(): Promise<OllamaStatus> {
  const response = await apiRag.get<OllamaStatus>(OLLAMA_ENDPOINTS.status);
  return response.data;
}

async function patchOllamaPreferences(
  update: OllamaPreferencesUpdate,
): Promise<OllamaPreferences> {
  const response = await apiRag.patch<OllamaPreferences>(
    OLLAMA_ENDPOINTS.preferences,
    update,
  );
  return response.data;
}

export function useOllamaPreferences(
  open: boolean,
  refreshKey: number,
  onSavingChange: (saving: boolean) => void,
) {
  const queryClient = useQueryClient();
  const preferencesQuery = useQuery({
    queryKey: ollamaKeys.preferences(),
    queryFn: fetchOllamaPreferences,
    enabled: false,
    retry: false,
  });
  const statusQuery = useQuery({
    queryKey: ollamaKeys.status(),
    queryFn: fetchOllamaStatus,
    enabled: false,
    retry: false,
  });
  const saveMutation = useMutation({
    mutationFn: patchOllamaPreferences,
    onSuccess: (preferences) => {
      queryClient.setQueryData(ollamaKeys.preferences(), preferences);
    },
  });

  const reload = useCallback(async () => {
    await Promise.all([preferencesQuery.refetch(), statusQuery.refetch()]);
  }, [preferencesQuery.refetch, statusQuery.refetch]);

  useEffect(() => {
    if (open) void reload();
  }, [open, refreshKey, reload]);

  useEffect(() => {
    onSavingChange(saveMutation.isLoading);
    return () => onSavingChange(false);
  }, [onSavingChange, saveMutation.isLoading]);

  return {
    preferencesQuery,
    statusQuery,
    reload,
    saveMutation,
  };
}
