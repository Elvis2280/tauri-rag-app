import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CONFIGURATION_LABELS } from "@/constants/configuration";
import {
  OLLAMA_LABELS,
  OLLAMA_ROLE_LABELS,
  OLLAMA_SKELETON_ROW_COUNT,
} from "@/constants/ollama";
import { useOllamaPreferences } from "@/hooks/useOllamaPreferences";
import { extractApiErrorMessage } from "@/lib/api/errors";
import {
  isOllamaEditableRole,
  type OllamaEditableRole,
  type OllamaPreferencesUpdate,
} from "@/types/OllamaTypes";

type LlmModelsConfigurationProps = {
  open: boolean;
  refreshKey: number;
  disabled: boolean;
  onSavingChange: (saving: boolean) => void;
};

function comparableModelName(modelName: string): string {
  return modelName.replace(/:latest$/i, "");
}

function errorMessage(error: unknown): string {
  return extractApiErrorMessage(error, OLLAMA_LABELS.loadFailed);
}

export default function LlmModelsConfiguration({
  open,
  refreshKey,
  disabled,
  onSavingChange,
}: LlmModelsConfigurationProps) {
  const [draft, setDraft] = useState<OllamaPreferencesUpdate>({});
  const {
    preferencesQuery,
    statusQuery,
    reload,
    saveMutation,
  } = useOllamaPreferences(open, refreshKey, onSavingChange);
  const resetSaveMutation = saveMutation.reset;
  const preferences = preferencesQuery.data;
  const status = statusQuery.data;
  const editableRoles = useMemo(
    () => preferences?.editable_roles.filter(isOllamaEditableRole) ?? [],
    [preferences?.editable_roles],
  );
  const isLoading =
    preferencesQuery.isLoading ||
    statusQuery.isLoading ||
    preferencesQuery.isFetching ||
    statusQuery.isFetching;
  const loadError = preferencesQuery.error ?? statusQuery.error;
  const availableModels = status?.available_models ?? [];
  const canEdit =
    !disabled &&
    !saveMutation.isLoading &&
    !loadError &&
    status?.is_reachable === true &&
    availableModels.length > 0;

  useEffect(() => {
    if (preferences) {
      const initialDraft: OllamaPreferencesUpdate = {};
      for (const role of preferences.editable_roles) {
        if (isOllamaEditableRole(role) && preferences[role]) {
          initialDraft[role] = preferences[role];
        }
      }
      setDraft(initialDraft);
    }
  }, [preferences, open, refreshKey]);

  useEffect(() => {
    if (!open) {
      setDraft({});
      resetSaveMutation();
    }
  }, [open, resetSaveMutation]);

  const changedPreferences = useMemo(() => {
    const changed: OllamaPreferencesUpdate = {};
    for (const role of editableRoles) {
      if (draft[role] && draft[role] !== preferences?.[role]) {
        changed[role] = draft[role];
      }
    }
    return changed;
  }, [draft, editableRoles, preferences]);

  const modelIsEligible = (modelName: string, role: OllamaEditableRole) => {
    const model = status?.models.find(
      (candidate) =>
        comparableModelName(candidate.name) === comparableModelName(modelName),
    );
    return model?.eligible_roles.includes(role) ?? false;
  };

  const saveChanges = async () => {
    if (!Object.keys(changedPreferences).length || !canEdit) return;
    try {
      await saveMutation.mutateAsync(changedPreferences);
    } catch {
      // The mutation error is rendered inline so the draft remains available.
    }
  };

  return (
    <section
      aria-labelledby="llm-models-configuration-title"
      className="space-y-3 rounded border border-border bg-card p-4"
    >
      <div className="space-y-1">
        <h2 id="llm-models-configuration-title" className="font-heading text-base font-semibold">
          {CONFIGURATION_LABELS.llmModelsCategory}
        </h2>
        <p className="text-xs text-muted-foreground">{OLLAMA_LABELS.description}</p>
      </div>

      <div className="min-h-[26.25rem] sm:min-h-[18.75rem]">
        {isLoading && (
          <div role="status" aria-live="polite" className="space-y-3">
            <p className="text-xs text-muted-foreground">{OLLAMA_LABELS.loading}</p>
            {Array.from({ length: OLLAMA_SKELETON_ROW_COUNT }, (_, row) => (
              <div
                key={row}
                className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center"
                aria-hidden="true"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-border/75 motion-reduce:animate-none" />
                <div className="h-10 w-full animate-pulse rounded bg-border/75 motion-reduce:animate-none" />
              </div>
            ))}
            <div className="flex justify-end pt-3">
              <div className="h-10 w-32 animate-pulse rounded bg-border/75 motion-reduce:animate-none" aria-hidden="true" />
            </div>
          </div>
        )}

        {Boolean(loadError) && !isLoading && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-destructive">{errorMessage(loadError)}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
              {OLLAMA_LABELS.retry}
            </Button>
          </div>
        )}

        {!isLoading && preferences && (
          <div className="space-y-3">
            {status?.is_reachable === false && (
              <p role="status" className="text-sm text-muted-foreground">
                {OLLAMA_LABELS.notReachable}
              </p>
            )}
            {status?.is_reachable === true && availableModels.length === 0 && (
              <p role="status" className="text-sm text-muted-foreground">
                {OLLAMA_LABELS.noModels}
              </p>
            )}

            {editableRoles.map((role) => {
              const selectedModel = draft[role] ?? preferences[role] ?? "";
              const selectedIsListed = availableModels.some(
                (modelName) => modelName === selectedModel,
              );
              const selectedMatchesAvailable = availableModels.some(
                (modelName) =>
                  comparableModelName(modelName) ===
                  comparableModelName(selectedModel),
              );
              return (
                <div
                  key={role}
                  className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center"
                >
                  <label htmlFor={`ollama-model-${role}`} className="text-sm font-medium">
                    {OLLAMA_ROLE_LABELS[role]}
                  </label>
                  <select
                    id={`ollama-model-${role}`}
                    value={selectedModel}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, [role]: value }));
                    }}
                    disabled={!canEdit}
                    className="flex h-10 w-full rounded border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {!selectedModel && <option value="">{OLLAMA_LABELS.selectModel}</option>}
                    {!selectedIsListed && selectedModel && (
                      <option value={selectedModel} disabled>
                        {selectedModel}{" "}
                        {selectedMatchesAvailable
                          ? OLLAMA_LABELS.selectedAlias
                          : OLLAMA_LABELS.unavailable}
                      </option>
                    )}
                    {availableModels.map((modelName) => {
                      const compatible = modelIsEligible(modelName, role);
                      return (
                        <option key={modelName} value={modelName} disabled={!compatible}>
                          {modelName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              );
            })}

            {Boolean(saveMutation.error) && (
              <p role="alert" className="text-sm text-destructive">
                {extractApiErrorMessage(saveMutation.error, OLLAMA_LABELS.saveFailed)}
              </p>
            )}
            {saveMutation.isSuccess && Object.keys(changedPreferences).length === 0 && (
              <p role="status" className="text-sm text-muted-foreground">
                {OLLAMA_LABELS.saved}
              </p>
            )}
            {editableRoles.length === 0 && (
              <p className="text-sm text-muted-foreground">{OLLAMA_LABELS.noEditableRoles}</p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!canEdit || Object.keys(changedPreferences).length === 0}
                onClick={() => void saveChanges()}
              >
                {saveMutation.isLoading ? OLLAMA_LABELS.saving : OLLAMA_LABELS.saveChanges}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
