export const OLLAMA_EDITABLE_ROLES = [
  "ocr",
  "translation",
  "answer",
  "formatting",
  "cleaning",
] as const;

export type OllamaEditableRole = (typeof OLLAMA_EDITABLE_ROLES)[number];
export type OllamaPreferenceRole = OllamaEditableRole | "embedding";

export type OllamaPreferences = Partial<Record<OllamaPreferenceRole, string>> & {
  editable_roles: string[];
};

export type OllamaPreferencesUpdate = Partial<
  Record<OllamaEditableRole, string>
>;

export type OllamaModel = {
  name: string;
  eligible_roles: string[];
};

export type OllamaStatus = {
  is_reachable: boolean;
  available_models: string[];
  models: OllamaModel[];
};

export function isOllamaEditableRole(
  role: string,
): role is OllamaEditableRole {
  return OLLAMA_EDITABLE_ROLES.some((editableRole) => editableRole === role);
}
