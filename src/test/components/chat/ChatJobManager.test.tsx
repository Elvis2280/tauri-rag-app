import { act, render, waitFor } from "@testing-library/react";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatJobManager from "@/components/chat/ChatJobManager";
import { useChatStore } from "@/context/chatStore";
import { CHAT_ENDPOINTS } from "@/lib/api/endpoints";
import apiRag from "@/lib/axios";
import { CHAT_ROLE, CHAT_STATUS } from "@/types/ChatTypes";
import type { ChatJobResponse } from "@/types/MessageTypes";

vi.mock("@/lib/axios", () => ({ default: { chatJob: vi.fn() } }));

const mockedChatJob = vi.mocked(apiRag.chatJob);

function addPendingMessage(overrides: { jobId?: string; jobStatus?: "queued" | "running" } = {}) {
  const workspaceId = faker.string.uuid();
  const idempotencyKey = faker.string.uuid();
  const messageId = faker.string.uuid();
  useChatStore.getState().addMessage(
    {
      role: CHAT_ROLE.USER,
      content: faker.lorem.sentence(),
      workspaceId,
      idempotencyKey,
      ...overrides,
    },
    messageId,
  );
  return { messageId, workspaceId, idempotencyKey };
}

describe("ChatJobManager", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, messageOrder: [], chatTrackingPaused: false });
    mockedChatJob.mockReset();
  });

  it("submits the saved message and stores the completed answer and sources", async () => {
    // 1. ARRANGE
    const pending = addPendingMessage();
    const jobId = faker.string.uuid();
    const answer = {
      response: faker.lorem.paragraph(),
      english_markdown_id: faker.string.uuid(),
      japanese_markdown_id: null,
      sources: [{
        document_id: faker.string.uuid(),
        page_number: faker.number.int({ min: 1, max: 40 }),
        english_markdown_id: faker.string.uuid(),
        japanese_markdown_id: faker.string.uuid(),
      }],
    };
    const job: ChatJobResponse = {
      id: jobId,
      status: "completed",
      answer,
      error: null,
    };
    mockedChatJob.mockResolvedValue({ status: 200, data: job, retryAfter: null });

    // 2. ACT
    render(<ChatJobManager />);

    // 3. ASSERT
    await waitFor(() => {
      expect(useChatStore.getState().messageOrder).toHaveLength(2);
    });
    expect(mockedChatJob).toHaveBeenCalledWith(
      "POST",
      CHAT_ENDPOINTS.submit,
      pending.idempotencyKey,
      expect.objectContaining({ workspace_id: pending.workspaceId }),
    );
    const state = useChatStore.getState();
    expect(state.messages[pending.messageId]).toMatchObject({
      status: CHAT_STATUS.COMPLETED,
      idempotencyKey: undefined,
    });
    expect(state.messages[state.messageOrder[1]]).toMatchObject({
      role: CHAT_ROLE.ASSISTANT,
      content: answer.response,
      status: CHAT_STATUS.COMPLETED,
      sources: [{
        documentId: answer.sources[0].document_id,
        pageNumber: answer.sources[0].page_number,
      }],
    });
  });

  it("resumes a stored job using its original idempotency key", async () => {
    // 1. ARRANGE
    const jobId = faker.string.uuid();
    const pending = addPendingMessage({ jobId, jobStatus: "running" });
    const job: ChatJobResponse = {
      id: jobId,
      status: "failed",
      answer: null,
      error: { status_code: 500, message: faker.lorem.sentence() },
    };
    mockedChatJob.mockResolvedValue({ status: 200, data: job, retryAfter: null });

    // 2. ACT
    render(<ChatJobManager />);

    // 3. ASSERT
    await waitFor(() => {
      expect(useChatStore.getState().messageOrder).toHaveLength(2);
    });
    expect(mockedChatJob).toHaveBeenCalledWith(
      "GET",
      CHAT_ENDPOINTS.job(jobId),
      pending.idempotencyKey,
    );
    const state = useChatStore.getState();
    expect(state.messages[state.messageOrder[1]]).toMatchObject({
      role: CHAT_ROLE.ASSISTANT,
      content: job.error?.message,
      status: CHAT_STATUS.ERROR,
    });
  });

  it("polls a queued job after two seconds with the same idempotency key", async () => {
    // 1. ARRANGE
    const pending = addPendingMessage();
    const jobId = faker.string.uuid();
    const queuedJob: ChatJobResponse = {
      id: jobId,
      status: "queued",
      answer: null,
      error: null,
    };
    const completedJob: ChatJobResponse = {
      id: jobId,
      status: "completed",
      answer: {
        response: faker.lorem.sentence(),
        english_markdown_id: null,
        japanese_markdown_id: null,
        sources: [],
      },
      error: null,
    };
    mockedChatJob
      .mockResolvedValueOnce({ status: 202, data: queuedJob, retryAfter: null })
      .mockResolvedValueOnce({ status: 200, data: completedJob, retryAfter: null });
    vi.useFakeTimers();
    const view = render(<ChatJobManager />);

    // 2. ACT
    try {
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockedChatJob).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });

      // 3. ASSERT
      expect(mockedChatJob).toHaveBeenCalledTimes(2);
      expect(mockedChatJob).toHaveBeenNthCalledWith(
        1,
        "POST",
        CHAT_ENDPOINTS.submit,
        pending.idempotencyKey,
        expect.objectContaining({ workspace_id: pending.workspaceId }),
      );
      expect(mockedChatJob).toHaveBeenNthCalledWith(
        2,
        "GET",
        CHAT_ENDPOINTS.job(jobId),
        pending.idempotencyKey,
      );
      expect(useChatStore.getState().messages[useChatStore.getState().messageOrder[1]]).toMatchObject({
        content: completedJob.answer?.response,
        status: CHAT_STATUS.COMPLETED,
      });
    } finally {
      view.unmount();
      vi.useRealTimers();
    }
  });

  it("retries a full queue after Retry-After using the original key", async () => {
    // 1. ARRANGE
    const pending = addPendingMessage();
    const job: ChatJobResponse = {
      id: faker.string.uuid(),
      status: "completed",
      answer: {
        response: faker.lorem.sentence(),
        english_markdown_id: null,
        japanese_markdown_id: null,
        sources: [],
      },
      error: null,
    };
    mockedChatJob
      .mockResolvedValueOnce({ status: 503, data: { detail: faker.lorem.sentence() }, retryAfter: "5" })
      .mockResolvedValueOnce({ status: 200, data: job, retryAfter: null });
    vi.useFakeTimers();
    const view = render(<ChatJobManager />);

    // 2. ACT
    try {
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockedChatJob).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4_999);
      });
      expect(mockedChatJob).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });

      // 3. ASSERT
      expect(mockedChatJob).toHaveBeenCalledTimes(2);
      expect(mockedChatJob).toHaveBeenNthCalledWith(
        1,
        "POST",
        CHAT_ENDPOINTS.submit,
        pending.idempotencyKey,
        expect.objectContaining({ workspace_id: pending.workspaceId }),
      );
      expect(mockedChatJob).toHaveBeenNthCalledWith(
        2,
        "POST",
        CHAT_ENDPOINTS.submit,
        pending.idempotencyKey,
        expect.any(Object),
      );
    } finally {
      view.unmount();
      vi.useRealTimers();
    }
  });
});
