import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  API_ACCESS_LIMITS,
  API_ACCESS_MASK,
  API_ACCESS_MESSAGES,
} from "@/constants/apiAccess";

type AccessField = "apiKey" | "serverHost";

type ApiAccessFormValues = {
  apiKey: string;
  serverHost: string;
};

const apiAccessSchema: yup.ObjectSchema<ApiAccessFormValues> = yup.object({
  apiKey: yup
    .string()
    .trim()
    .required(API_ACCESS_MESSAGES.apiKeyRequired)
    .max(API_ACCESS_LIMITS.apiKey, API_ACCESS_MESSAGES.apiKeyTooLong),
  serverHost: yup
    .string()
    .trim()
    .required(API_ACCESS_MESSAGES.serverHostRequired)
    .max(API_ACCESS_LIMITS.serverHost, API_ACCESS_MESSAGES.serverHostTooLong),
});

type ApiAccessModalProps = {
  open: boolean;
  required?: boolean;
  serverHost: string;
  statusError?: string | null;
  onOpenChange: (open: boolean) => void;
  onCancelRequired: () => void;
  onSetup: (apiKey: string, serverHost: string) => Promise<void>;
  onUpdateApiKey: (apiKey: string) => Promise<void>;
  onUpdateServerHost: (serverHost: string) => Promise<void>;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function ApiAccessModal({
  open,
  required = false,
  serverHost,
  statusError,
  onOpenChange,
  onCancelRequired,
  onSetup,
  onUpdateApiKey,
  onUpdateServerHost,
}: ApiAccessModalProps) {
  const [editing, setEditing] = useState<AccessField | null>(null);
  const [saving, setSaving] = useState<AccessField | "setup" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    reset,
    setFocus,
    setValue,
    trigger,
  } = useForm<ApiAccessFormValues>({
    resolver: yupResolver(apiAccessSchema),
    defaultValues: { apiKey: "", serverHost },
  });

  useEffect(() => {
    if (!open) return;
    reset({ apiKey: "", serverHost });
    setEditing(null);
    setSaving(null);
    setFormError(null);
  }, [open, reset, serverHost]);

  useEffect(() => {
    if (editing) setFocus(editing);
  }, [editing, setFocus]);

  const closeConfiguredModal = () => {
    if (saving || required) return;
    reset({ apiKey: "", serverHost });
    setEditing(null);
    setFormError(null);
    onOpenChange(false);
  };

  const startEditing = (field: AccessField) => {
    setFormError(null);
    setValue(field, "", { shouldDirty: false });
    setEditing(field);
  };

  const cancelEditing = () => {
    if (saving) return;
    reset({ apiKey: "", serverHost });
    setEditing(null);
    setFormError(null);
  };

  const saveField = async (field: AccessField) => {
    const valid = await trigger(field);
    if (!valid) return;

    setSaving(field);
    setFormError(null);
    try {
      const value = getValues(field).trim();
      if (field === "apiKey") {
        await onUpdateApiKey(value);
      } else {
        await onUpdateServerHost(value);
      }
      reset({ apiKey: "", serverHost: field === "serverHost" ? value : serverHost });
      setEditing(null);
    } catch (error) {
      setFormError(
        errorMessage(
          error,
          field === "apiKey"
            ? API_ACCESS_MESSAGES.apiKeyUpdateFailed
            : API_ACCESS_MESSAGES.serverHostUpdateFailed,
        ),
      );
    } finally {
      setSaving(null);
    }
  };

  const submitSetup = handleSubmit(async (values) => {
    setSaving("setup");
    setFormError(null);
    try {
      await onSetup(values.apiKey.trim(), values.serverHost.trim());
      reset({ apiKey: "", serverHost: values.serverHost.trim() });
    } catch (error) {
      setFormError(errorMessage(error, API_ACCESS_MESSAGES.setupFailed));
    } finally {
      setSaving(null);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeConfiguredModal();
      }}
    >
      <DialogContent
        className="rounded sm:max-w-xl"
        showCloseButton={!required && !saving}
        onEscapeKeyDown={(event) => {
          if (required || saving) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (required || saving) event.preventDefault();
        }}
      >
        <form onSubmit={submitSetup} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>API access</DialogTitle>
            <DialogDescription>
              {required
                ? "Connect this app to your RAG server. Your API key is stored only in the operating system credential vault."
                : "Manage the credentials and server used by this app."}
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-border rounded border border-border bg-card">
            <section className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <label id="api-key-label" htmlFor="api-key" className="font-medium">
                    API key
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Securely stored on this computer and never displayed again.
                  </p>
                </div>
                {!required && editing !== "apiKey" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={editing !== null || saving !== null}
                    aria-label="Update API key"
                    onClick={() => startEditing("apiKey")}
                  >
                    Update
                  </Button>
                )}
              </div>

              {required || editing === "apiKey" ? (
                <input
                  key="api-key-edit"
                  id="api-key"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.apiKey)}
                  aria-describedby={errors.apiKey ? "api-key-error" : undefined}
                  disabled={saving !== null}
                  className="flex h-10 w-full rounded border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("apiKey")}
                />
              ) : (
                <input
                  key="api-key-view"
                  id="api-key"
                  type="password"
                  readOnly
                  value={API_ACCESS_MASK}
                  className="flex h-10 w-full rounded border border-input bg-background px-3 py-2 text-sm text-muted-foreground outline-none"
                />
              )}
              {errors.apiKey && (
                <p id="api-key-error" role="alert" className="text-xs text-destructive">
                  {errors.apiKey.message}
                </p>
              )}
              {!required && editing === "apiKey" && (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" disabled={saving !== null} onClick={cancelEditing}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" disabled={saving !== null} onClick={() => void saveField("apiKey")}>
                    {saving === "apiKey" ? "Saving…" : "Save"}
                  </Button>
                </div>
              )}
            </section>

            <section className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <label id="server-host-label" htmlFor="server-host" className="font-medium">
                    Server Host
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {API_ACCESS_MESSAGES.serverHostDescription}
                  </p>
                </div>
                {!required && editing !== "serverHost" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={editing !== null || saving !== null}
                    aria-label="Update Server Host"
                    onClick={() => startEditing("serverHost")}
                  >
                    Update
                  </Button>
                )}
              </div>

              {required || editing === "serverHost" ? (
                <input
                  key="server-host-edit"
                  id="server-host"
                  type="text"
                  inputMode="url"
                  placeholder="localhost:8080"
                  autoComplete="url"
                  aria-invalid={Boolean(errors.serverHost)}
                  aria-describedby={errors.serverHost ? "server-host-error" : undefined}
                  disabled={saving !== null}
                  className="flex h-10 w-full rounded border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("serverHost")}
                />
              ) : (
                <input
                  key="server-host-view"
                  id="server-host"
                  type="text"
                  readOnly
                  value={serverHost}
                  className="flex h-10 w-full rounded border border-input bg-background px-3 py-2 font-mono text-sm text-muted-foreground outline-none"
                />
              )}
              {errors.serverHost && (
                <p id="server-host-error" role="alert" className="text-xs text-destructive">
                  {errors.serverHost.message}
                </p>
              )}
              {!required && editing === "serverHost" && (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" disabled={saving !== null} onClick={cancelEditing}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" disabled={saving !== null} onClick={() => void saveField("serverHost")}>
                    {saving === "serverHost" ? "Saving…" : "Save"}
                  </Button>
                </div>
              )}
            </section>
          </div>

          {(formError || statusError) && (
            <p role="alert" className="text-sm text-destructive">
              {formError ?? statusError}
            </p>
          )}

          {required && (
            <DialogFooter>
              <Button type="button" variant="ghost" disabled={saving !== null} onClick={onCancelRequired}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving !== null}>
                {saving === "setup" ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
