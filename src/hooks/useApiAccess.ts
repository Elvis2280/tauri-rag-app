import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAccessSettings,
  normalizeNativeError,
  saveAccessSettings,
  updateApiKey,
  updateServerHost,
  validateSavedAccess,
} from "@/lib/axios";
import { API_ACCESS_MESSAGES } from "@/constants/apiAccess";

type ApiAccessState = {
  loading: boolean;
  configured: boolean;
  setupPending: boolean;
  serverHost: string;
  error: string | null;
};

export function useApiAccess() {
  const [state, setState] = useState<ApiAccessState>({
    loading: true,
    configured: false,
    setupPending: false,
    serverHost: "",
    error: null,
  });
  const accessRevision = useRef(0);

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const status = await getAccessSettings();
      setState({
        ...status,
        loading: false,
        setupPending: !status.configured,
        error: null,
      });
    } catch (error) {
      setState({
        loading: false,
        configured: false,
        setupPending: true,
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
    accessRevision.current += 1;
    setState({ ...status, loading: false, setupPending: true, error: null });
  }, []);

  const saveApiKey = useCallback(async (apiKey: string) => {
    await updateApiKey(apiKey);
    accessRevision.current += 1;
    setState((current) => ({ ...current, error: null }));
  }, []);

  const saveServerHost = useCallback(async (serverHost: string) => {
    const normalizedHost = await updateServerHost(serverHost);
    accessRevision.current += 1;
    setState((current) => ({
      ...current,
      serverHost: normalizedHost,
      error: null,
    }));
  }, []);

  const finishSetup = useCallback(() => {
    setState((current) => ({
      ...current,
      configured: true,
      setupPending: false,
    }));
  }, []);

  const checkSavedAccess = useCallback(async (): Promise<boolean> => {
    const revision = accessRevision.current;
    try {
      await validateSavedAccess();
      if (revision !== accessRevision.current) return false;
      setState((current) => ({ ...current, error: null }));
      return true;
    } catch (error) {
      if (revision !== accessRevision.current) return false;
      const normalizedError = normalizeNativeError(
        error,
        API_ACCESS_MESSAGES.accessCheckFailed,
      );
      setState((current) => ({ ...current, error: normalizedError.message }));
      throw normalizedError;
    }
  }, []);

  return {
    ...state,
    refresh,
    setup,
    saveApiKey,
    saveServerHost,
    finishSetup,
    checkSavedAccess,
  };
}
