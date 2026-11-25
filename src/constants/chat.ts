export const CHAT_JOB_POLL_INTERVAL_MS = 2_000;
export const CHAT_JOB_RETRY_FALLBACK_MS = 5_000;
export const CHAT_JOB_MAX_RESULT_AGE_MS = 24 * 60 * 60 * 1_000;
export const CHAT_TRACKING_PAUSE_CHECK_MS = 250;

export const CHAT_JOB_MESSAGES = {
  expired:
    "This chat request expired before its result could be recovered. Please send it again.",
  unavailable:
    "This chat result is no longer available. Please send your message again.",
  missingRequest:
    "This saved chat request cannot be resumed. Please send your message again.",
  invalidResponse: "The chat service returned an invalid job response.",
  missingAnswer: "The chat job completed without an answer.",
  failed: "The chat request failed.",
} as const;
