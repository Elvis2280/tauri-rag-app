import { useCallback, useEffect, useState } from 'react';
import {
  clearCredential,
  getCredentialStatus,
  saveCredential,
} from '@/lib/axios';

type CredentialState = {
  loading: boolean;
  configured: boolean;
  error: string | null;
};

export function useCredential() {
  const [state, setState] = useState<CredentialState>({
    loading: true,
    configured: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const status = await getCredentialStatus();
      setState({ loading: false, configured: status.configured, error: null });
    } catch {
      setState({
        loading: false,
        configured: false,
        error: 'Unable to access the operating system credential vault',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const configure = useCallback(async (apiKey: string) => {
    await saveCredential(apiKey);
    setState({ loading: false, configured: true, error: null });
  }, []);

  const clear = useCallback(async () => {
    await clearCredential();
    setState({ loading: false, configured: false, error: null });
  }, []);

  return { ...state, configure, clear, refresh };
}
