import { useEffect } from "react";
import {
  CHAT_JOB_MESSAGES,
  CHAT_JOB_MAX_RESULT_AGE_MS,
  CHAT_JOB_POLL_INTERVAL_MS,
  CHAT_JOB_RETRY_FALLBACK_MS,
  CHAT_TRACKING_PAUSE_CHECK_MS,
} from "@/constants/chat";
import { useChatStore } from "@/context/chatStore";
import { CHAT_ENDPOINTS } from "@/lib/api/endpoints";
import apiRag from "@/lib/axios";
import { CHAT_ROLE, CHAT_STATUS, type ChatMessage } from "@/types/ChatTypes";
import type {
  ChatJobResponse,
  ChatJobStatus,
  SendMessageSuccessResponse,
} from "@/types/MessageTypes";

const activeTrackers = new Map<string, AbortController>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChatJobStatus(value: unknown): value is ChatJobStatus {
  return value === "queued" || value === "running" || value === "completed" || value === "failed";
}

function parseAnswer(value: unknown): SendMessageSuccessResponse | null {
  if (
    !isRecord(value) ||
    typeof value.response !== "string" ||
    !Array.isArray(value.sources)
  ) {
    return null;
  }

  const englishId = value.english_markdown_id;
  const japaneseId = value.japanese_markdown_id;
  if (
    !(typeof englishId === "string" || englishId === null) ||
    !(typeof japaneseId === "string" || japaneseId === null)
  ) {
    return null;
  }

  const sources: SendMessageSuccessResponse["sources"] = [];
  for (const source of value.sources) {
    if (
      !isRecord(source) ||
      typeof source.document_id !== "string" ||
      typeof source.page_number !== "number" ||
      typeof source.english_markdown_id !== "string" ||
      typeof source.japanese_markdown_id !== "string"
    ) {
      return null;
    }

    sources.push({
      document_id: source.document_id,
      page_number: source.page_number,
      english_markdown_id: source.english_markdown_id,
      japanese_markdown_id: source.japanese_markdown_id,
    });
  }

  return {
    response: value.response,
    english_markdown_id: englishId,
    japanese_markdown_id: japaneseId,
    sources,
  };
}

function parseJobResponse(value: unknown): ChatJobResponse | null {
  if (!isRecord(value) || typeof value.id !== "string" || !isChatJobStatus(value.status)) {
    return null;
  }

  const status = value.status;
  const answer = value.answer === null ? null : parseAnswer(value.answer);
  if (value.answer !== null && answer === null) return null;

  let error: ChatJobResponse["error"] = null;
  if (value.error !== null) {
    if (
      !isRecord(value.error) ||
      typeof value.error.status_code !== "number" ||
      typeof value.error.message !== "string"
    ) {
      return null;
    }
    error = { status_code: value.error.status_code, message: value.error.message };
  }

  return { id: value.id, status, answer, error };
}

function errorMessage(value: unknown, fallback: string): string {
  if (isRecord(value)) {
    if (typeof value.message === "string" && value.message.trim()) return value.message;
    if (typeof value.detail === "string" && value.detail.trim()) return value.detail;
    if (Array.isArray(value.detail)) {
      const detail = value.detail.find((item): item is Record<string, unknown> =>
        isRecord(item) && typeof item.msg === "string",
      );
      if (detail && typeof detail.msg === "string") return detail.msg;
    }
  }
  return fallback;
}

function retryDelay(value: string | null): number {
  if (!value) return CHAT_JOB_RETRY_FALLBACK_MS;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const retryAt = Date.parse(value);
  return Number.isNaN(retryAt)
    ? CHAT_JOB_RETRY_FALLBACK_MS
    : Math.max(0, retryAt - Date.now());
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function currentPendingMessage(id: string): ChatMessage | undefined {
  const message = useChatStore.getState().messages[id];
  return message?.role === CHAT_ROLE.USER && message.status === CHAT_STATUS.PENDING
    ? message
    : undefined;
}

function isPastResultRetention(message: ChatMessage): boolean {
  const createdAt = Date.parse(message.createdAt);
  return Number.isFinite(createdAt) && Date.now() - createdAt >= CHAT_JOB_MAX_RESULT_AGE_MS;
}

function finishMessage(
  id: string,
  status: typeof CHAT_STATUS.COMPLETED | typeof CHAT_STATUS.ERROR,
  content: string,
  answer?: SendMessageSuccessResponse,
): void {
  if (!currentPendingMessage(id)) return;
  const store = useChatStore.getState();
  store.resolvePendingMessage(
    id,
    status,
    {
      role: CHAT_ROLE.ASSISTANT,
      content,
      ...(answer?.english_markdown_id
        ? { englishMarkdownId: answer.english_markdown_id }
        : {}),
      ...(answer?.japanese_markdown_id
        ? { japaneseMarkdownId: answer.japanese_markdown_id }
        : {}),
      ...(answer
        ? {
            sources: answer.sources.map((source) => ({
              documentId: source.document_id,
              pageNumber: source.page_number,
              englishMarkdownId: source.english_markdown_id,
              japaneseMarkdownId: source.japanese_markdown_id,
            })),
          }
        : {}),
    },
    crypto.randomUUID(),
  );
}

function finishFromJob(id: string, job: ChatJobResponse): boolean {
  if (job.status === "completed") {
    if (!job.answer) {
      finishMessage(id, CHAT_STATUS.ERROR, CHAT_JOB_MESSAGES.missingAnswer);
    } else {
      finishMessage(id, CHAT_STATUS.COMPLETED, job.answer.response, job.answer);
    }
    return true;
  }

  if (job.status === "failed") {
    finishMessage(id, CHAT_STATUS.ERROR, job.error?.message ?? CHAT_JOB_MESSAGES.failed);
    return true;
  }

  useChatStore.getState().updateMessage(id, { jobId: job.id, jobStatus: job.status });
  return false;
}

async function waitForRequest(ms: number, controller: AbortController): Promise<void> {
  let remaining = Math.max(0, ms);
  while (!controller.signal.aborted) {
    if (useChatStore.getState().chatTrackingPaused) {
      await wait(CHAT_TRACKING_PAUSE_CHECK_MS);
      continue;
    }
    if (remaining <= 0) return;
    const interval = Math.min(CHAT_TRACKING_PAUSE_CHECK_MS, remaining);
    await wait(interval);
    remaining -= interval;
  }
}

async function trackChatJob(id: string, controller: AbortController): Promise<void> {
  while (!controller.signal.aborted) {
    if (useChatStore.getState().chatTrackingPaused) {
      await waitForRequest(CHAT_TRACKING_PAUSE_CHECK_MS, controller);
      continue;
    }

    const message = currentPendingMessage(id);
    if (!message) return;
    if (!message.idempotencyKey || !message.workspaceId) {
      finishMessage(id, CHAT_STATUS.ERROR, CHAT_JOB_MESSAGES.missingRequest);
      return;
    }
    if (isPastResultRetention(message)) {
      finishMessage(
        id,
        CHAT_STATUS.ERROR,
        message.jobId ? CHAT_JOB_MESSAGES.unavailable : CHAT_JOB_MESSAGES.expired,
      );
      return;
    }

    if (!message.jobId) {
      try {
        const response = await apiRag.chatJob<unknown>(
          "POST",
          CHAT_ENDPOINTS.submit,
          message.idempotencyKey,
          { workspace_id: message.workspaceId, message: message.content },
        );
        if (controller.signal.aborted || useChatStore.getState().chatTrackingPaused) continue;
        if (response.status === 503) {
          await waitForRequest(retryDelay(response.retryAfter), controller);
          continue;
        }
        if (response.status >= 500) {
          await waitForRequest(CHAT_JOB_RETRY_FALLBACK_MS, controller);
          continue;
        }
        if (response.status >= 400) {
          finishMessage(
            id,
            CHAT_STATUS.ERROR,
            errorMessage(response.data, CHAT_JOB_MESSAGES.failed),
          );
          return;
        }

        const job = parseJobResponse(response.data);
        if (!job) {
          finishMessage(id, CHAT_STATUS.ERROR, CHAT_JOB_MESSAGES.invalidResponse);
          return;
        }
        if (finishFromJob(id, job)) return;
        await waitForRequest(CHAT_JOB_POLL_INTERVAL_MS, controller);
      } catch {
        if (controller.signal.aborted) return;
        await waitForRequest(CHAT_JOB_RETRY_FALLBACK_MS, controller);
      }
      continue;
    }

    try {
      const response = await apiRag.chatJob<unknown>(
        "GET",
        CHAT_ENDPOINTS.job(message.jobId),
        message.idempotencyKey,
      );
      if (controller.signal.aborted || useChatStore.getState().chatTrackingPaused) continue;
      if (response.status === 503) {
        await waitForRequest(retryDelay(response.retryAfter), controller);
        continue;
      }
      if (response.status === 404) {
        finishMessage(id, CHAT_STATUS.ERROR, CHAT_JOB_MESSAGES.unavailable);
        return;
      }
      if (response.status >= 500) {
        await waitForRequest(CHAT_JOB_RETRY_FALLBACK_MS, controller);
        continue;
      }
      if (response.status >= 400) {
        finishMessage(
          id,
          CHAT_STATUS.ERROR,
          errorMessage(response.data, CHAT_JOB_MESSAGES.failed),
        );
        return;
      }

      const job = parseJobResponse(response.data);
      if (!job) {
        finishMessage(id, CHAT_STATUS.ERROR, CHAT_JOB_MESSAGES.invalidResponse);
        return;
      }
      if (finishFromJob(id, job)) return;
      await waitForRequest(CHAT_JOB_POLL_INTERVAL_MS, controller);
    } catch {
      if (controller.signal.aborted) return;
      await waitForRequest(CHAT_JOB_POLL_INTERVAL_MS, controller);
    }
  }
}

export default function ChatJobManager() {
  const messages = useChatStore((state) => state.messages);
  const messageOrder = useChatStore((state) => state.messageOrder);
  const paused = useChatStore((state) => state.chatTrackingPaused);

  useEffect(() => {
    const pendingIds = new Set(
      messageOrder.filter((id) => {
        const message = messages[id];
        return message?.role === CHAT_ROLE.USER && message.status === CHAT_STATUS.PENDING;
      }),
    );

    for (const [id, controller] of activeTrackers) {
      if (!pendingIds.has(id)) {
        controller.abort();
        activeTrackers.delete(id);
      }
    }

    if (!paused) {
      for (const id of pendingIds) {
        if (activeTrackers.has(id)) continue;
        const controller = new AbortController();
        activeTrackers.set(id, controller);
        void trackChatJob(id, controller)
          .catch(() => {
            if (!controller.signal.aborted) {
              finishMessage(id, CHAT_STATUS.ERROR, CHAT_JOB_MESSAGES.failed);
            }
          })
          .finally(() => {
            if (activeTrackers.get(id) === controller) activeTrackers.delete(id);
          });
      }
    }
  }, [messages, messageOrder, paused]);

  useEffect(
    () => () => {
      for (const controller of activeTrackers.values()) controller.abort();
      activeTrackers.clear();
    },
    [],
  );

  return null;
}
