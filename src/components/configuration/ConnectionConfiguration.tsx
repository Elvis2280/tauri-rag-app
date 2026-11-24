import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@/components/ui/button";
import { CONFIGURATION_LABELS } from "@/constants/configuration";
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

type ConnectionConfigurationProps = {
  open: boolean;
  required: boolean;
  serverHost: string;
  statusError?: string | null;
  onBusyChange: (busy: boolean) => void;
  onCancelRequired: () => void;
  onRequestClose: () => void;
  onSetup: (apiKey: string, serverHost: string) => Promise<void>;
  onUpdateApiKey: (apiKey: string) => Promise<void>;
  onUpdateServerHost: (serverHost: string) => Promise<void>;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function ConnectionConfiguration({
  open,
  required,
  serverHost,
  statusError,
  onBusyChange,
  onCancelRequired,
  onRequestClose,
  onSetup,
  onUpdateApiKey,
  onUpdateServerHost,
}: ConnectionConfigurationProps) {
  const [editing, setEditing] = useState<AccessField | null>(null);
  const [saving, setSaving] = useState<AccessField | "setup" | null>(null);
  const [setupSaved, setSetupSaved] = useState(false);
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
    onBusyChange(saving !== null);
  }, [onBusyChange, saving]);

  useEffect(() => {
    if (!open) return;
    reset({ apiKey: "", serverHost });
    setEditing(null);
    setSaving(null);
    setFormError(null);
  }, [open, reset, serverHost]);

  useEffect(() => {
    if (open) setSetupSaved(false);
  }, [open]);

  useEffect(() => {
    if (editing) setFocus(editing);
  }, [editing, setFocus]);

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
      setSetupSaved(true);
    } catch (error) {
      setFormError(errorMessage(error, API_ACCESS_MESSAGES.setupFailed));
    } finally {
      setSaving(null);
    }
  });

  return (
    <section
      aria-labelledby="connection-configuration-title"
      className="space-y-3 rounded border border-border bg-card p-4"
    >
      <div className="space-y-1">
        <h2 id="connection-configuration-title" className="font-heading text-base font-semibold">
          {CONFIGURATION_LABELS.connectionCategory}
        </h2>
        <p className="text-xs text-muted-foreground">
          {required
            ? CONFIGURATION_LABELS.connectionRequiredDescription
            : CONFIGURATION_LABELS.connectionDescription}
        </p>
      </div>

      <form
        onSubmit={required ? submitSetup : (event) => event.preventDefault()}
        className="space-y-4"
      >
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <label htmlFor="api-key" className="font-medium">
                {CONFIGURATION_LABELS.apiKey}
              </label>
              <p className="text-xs text-muted-foreground">
                {CONFIGURATION_LABELS.apiKeyDescription}
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
                {CONFIGURATION_LABELS.update}
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
                {CONFIGURATION_LABELS.cancel}
              </Button>
              <Button type="button" size="sm" disabled={saving !== null} onClick={() => void saveField("apiKey")}>
                {saving === "apiKey"
                  ? CONFIGURATION_LABELS.saving
                  : CONFIGURATION_LABELS.save}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <label htmlFor="server-host" className="font-medium">
                {CONFIGURATION_LABELS.serverHost}
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
                {CONFIGURATION_LABELS.update}
              </Button>
            )}
          </div>

          {required || editing === "serverHost" ? (
            <input
              key="server-host-edit"
              id="server-host"
              type="text"
              inputMode="url"
              placeholder={CONFIGURATION_LABELS.serverHostPlaceholder}
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
                {CONFIGURATION_LABELS.cancel}
              </Button>
              <Button type="button" size="sm" disabled={saving !== null} onClick={() => void saveField("serverHost")}>
                {saving === "serverHost"
                  ? CONFIGURATION_LABELS.saving
                  : CONFIGURATION_LABELS.save}
              </Button>
            </div>
          )}
        </div>

        {(formError || statusError) && (
          <p role="alert" className="text-sm text-destructive">
            {formError ?? statusError}
          </p>
        )}

        {required && (
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" disabled={saving !== null} onClick={onCancelRequired}>
              {CONFIGURATION_LABELS.cancel}
            </Button>
            <Button type="submit" disabled={saving !== null}>
              {saving === "setup"
                ? CONFIGURATION_LABELS.saving
                : CONFIGURATION_LABELS.save}
            </Button>
            <Button type="button" disabled={saving !== null || !setupSaved} onClick={onRequestClose}>
              {CONFIGURATION_LABELS.done}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}
