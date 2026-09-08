import { useCallback, useEffect, useState } from "react";
import {
  getAccessSettings,
  normalizeNativeError,
  saveAccessSettings,
  updateApiKey,
  updateServerHost,
} from "@/lib/axios";

type ApiAccessState = {
  loading: boolean;
  configured: boolean;
  serverHost: string;
  error: string | null;
};

export function useApiAccess() {
  const [state, setState] = useState<ApiAccessState>({
    loading: true,
    configured: false,
    serverHost: "",
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const status = await getAccessSettings();
      setState({ ...status, loading: false, error: null });
    } catch (error) {
      setState({
        loading: false,
        configured: false,
        serverHost: "",
        error: normalizeNativeError(
          error,
          "Unable to load the API access settings",
        ).message,
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setup = useCallback(async (apiKey: string, serverHost: string) => {
    const status = await saveAccessSettings(apiKey, serverHost);
    setState({ ...status, loading: false, error: null });
  }, []);

  const saveApiKey = useCallback(async (apiKey: string) => {
    await updateApiKey(apiKey);
    setState((current) => ({ ...current, error: null }));
  }, []);

  const saveServerHost = useCallback(async (serverHost: string) => {
    const normalizedHost = await updateServerHost(serverHost);
    setState((current) => ({
      ...current,
      serverHost: normalizedHost,
      error: null,
    }));
  }, []);

  return { ...state, refresh, setup, saveApiKey, saveServerHost };
}
