import type { OllamaEditableRole } from "@/types/OllamaTypes";

export const OLLAMA_ENDPOINTS = {
  status: "/ollama/status",
  preferences: "/ollama/preferences",
} as const;

export const OLLAMA_ROLE_LABELS: Record<OllamaEditableRole, string> = {
  ocr: "OCR",
  translation: "Translation",
  answer: "Answer",
  formatting: "Formatting",
  cleaning: "Cleaning",
};

export const OLLAMA_SKELETON_ROW_COUNT = 3;

export const OLLAMA_LABELS = {
  description: "Choose which installed model handles each editable task.",
  loading: "Loading model preferences…",
  loadFailed: "Unable to load model preferences.",
  retry: "Retry loading",
  notReachable: "The Ollama service is not reachable. Model selection is disabled.",
  noModels: "No available models were reported by the server.",
  selectModel: "Select a model",
  unavailable: "(currently selected; unavailable)",
  selectedAlias: "(current selection; matching installed model shown below)",
  noEditableRoles: "The server has no editable model roles configured.",
  saveChanges: "Save changes",
  saving: "Saving…",
  saveFailed: "Unable to save model preferences.",
  saved: "Model preferences saved.",
} as const;
