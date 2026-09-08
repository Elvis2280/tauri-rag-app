export const API_ACCESS_MASK = "••••••••••••";

export const API_ACCESS_LIMITS = {
  apiKey: 4096,
  serverHost: 2048,
} as const;

export const API_ACCESS_MESSAGES = {
  apiKeyRequired: "Enter the API key provided by your administrator.",
  apiKeyTooLong: "The API key is too long.",
  serverHostRequired: "Enter the server hostname or IP address.",
  serverHostTooLong: "The server address is too long.",
  setupFailed: "The API access settings could not be validated.",
  apiKeyUpdateFailed: "The API key could not be validated.",
  serverHostUpdateFailed: "The server host could not be validated.",
} as const;
