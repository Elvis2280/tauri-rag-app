import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ApiAccessScreenProps = {
  error: string | null;
  vaultError: string | null;
  apiBaseUrl?: string;
  onConfigure: (apiKey: string) => Promise<void>;
  onClose: () => void;
};

export default function ApiAccessScreen({
  error,
  vaultError,
  apiBaseUrl,
  onConfigure,
  onClose,
}: ApiAccessScreenProps) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiKey.trim()) {
      setFormError('Enter the API key provided by your administrator.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onConfigure(apiKey);
      setApiKey('');
    } catch (configureError) {
      setFormError(
        configureError instanceof Error
          ? configureError.message
          : 'The API key could not be validated.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <form
        className="relative w-full max-w-md space-y-5 rounded-lg border border-border bg-card p-6 shadow-lg"
        onSubmit={handleSubmit}
      >
        <Button
          aria-label="Close API access"
          className="absolute right-3 top-3"
          onClick={onClose}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
        <div className="space-y-2">
          <h1 className="pr-8 text-xl font-semibold">Connect to RAG API</h1>
          <p className="text-sm text-muted-foreground">
            Enter the temporary access key from your administrator. It is saved
            only in this computer&apos;s secure credential store.
          </p>
          {apiBaseUrl && (
            <p className="text-xs text-muted-foreground">
              API server: <span className="font-mono">{apiBaseUrl}</span>
            </p>
          )}
        </div>
        <label className="block space-y-2 text-sm font-medium" htmlFor="api-key">
          API key
          <input
            id="api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {(error || vaultError || formError) && (
          <p role="alert" className="text-sm text-destructive">
            {formError ?? error ?? vaultError}
          </p>
        )}
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Checking key…' : 'Connect'}
        </Button>
      </form>
    </main>
  );
}
