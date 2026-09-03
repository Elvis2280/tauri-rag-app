import { useCallback, useEffect, useState } from 'react';
import {
  clearCredential,
  getCredentialStatus,
  normalizeNativeError,
  saveCredential,
} from '@/lib/axios';

type CredentialState = {
  loading: boolean;
  configured: boolean;
  apiBaseUrl: string;
  error: string | null;
};

export function useCredential() {
  const [state, setState] = useState<CredentialState>({
    loading: true,
    configured: false,
    apiBaseUrl: '',
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const status = await getCredentialStatus();
      setState({
        loading: false,
        configured: status.configured,
        apiBaseUrl: status.apiBaseUrl,
        error: null,
      });
    } catch (error) {
      setState({
        loading: false,
        configured: false,
        apiBaseUrl: '',
        error: normalizeNativeError(
          error,
          'Unable to access the operating system credential vault',
        ).message,
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const configure = useCallback(async (apiKey: string) => {
    await saveCredential(apiKey);
    setState((current) => ({
      ...current,
      loading: false,
      configured: true,
      error: null,
    }));
  }, []);

  const clear = useCallback(async () => {
    await clearCredential();
    setState((current) => ({
      ...current,
      loading: false,
      configured: false,
      error: null,
    }));
  }, []);

  return { ...state, configure, clear, refresh };
}
