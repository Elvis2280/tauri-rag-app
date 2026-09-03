import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';

type ApiAccessScreenProps = {
  error: string | null;
  vaultError: string | null;
  onConfigure: (apiKey: string) => Promise<void>;
};

export default function ApiAccessScreen({
  error,
  vaultError,
  onConfigure,
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
        className="w-full max-w-md space-y-5 rounded-lg border border-border bg-card p-6 shadow-lg"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Connect to RAG API</h1>
          <p className="text-sm text-muted-foreground">
            Enter the temporary access key from your administrator. It is saved
            only in this computer&apos;s secure credential store.
          </p>
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
