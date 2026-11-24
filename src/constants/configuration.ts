export const CONFIGURATION_LABELS = {
  title: "Configuration",
  description: "Manage the connection, model settings, and application logs.",
  requiredDescription:
    "Connect this app to your RAG server. Your API key is stored only in the operating system credential vault.",
  connectionCategory: "Connection configuration",
  connectionDescription: "Manage the credentials and server used by this app.",
  connectionRequiredDescription:
    "Enter the server address and API key to connect this app.",
  llmModelsCategory: "LLMs Models configuration",
  logsCategory: "Logs",
  apiKey: "API key",
  apiKeyDescription:
    "Securely stored on this computer and never displayed again.",
  serverHost: "Server Host",
  serverHostPlaceholder: "localhost:8080",
  update: "Update",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving…",
  done: "Done",
  logsDescription: "Open the application log folder.",
  openLogsFolder: "Open logs folder",
  logsFolderError: "Unable to open the application log folder.",
} as const;
