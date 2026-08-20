import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiRag from "@/lib/axios";
import { CHAT_ENDPOINTS } from "@/lib/api/endpoints";
import useMessage from "@/hooks/useMessage";
import { useChatStore } from "@/context/chatStore";
import { CHAT_ROLE, CHAT_STATUS } from "@/types/ChatTypes";
import type { SendMessageSuccessResponse } from "@/types/MessageTypes";
import { buildChatMessage } from "@/test/factories/chat.factory";
import { buildWorkspace } from "@/test/factories/workspace.factory";
import { toast } from "sonner";

vi.mock("@/lib/axios", () => ({ default: { post: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const mockedPost = vi.mocked(apiRag.post);
const mockedToastError = vi.mocked(toast.error);

function createResponse<T>(data: T): AxiosResponse<T> {
  return { data } as AxiosResponse<T>;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });

  return function QueryWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useMessage", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, messageOrder: [] });
    mockedPost.mockReset();
    mockedToastError.mockReset();
  });

  it("posts the workspace and message and persists the completed assistant response", async () => {
    // 1. ARRANGE
    const workspace = buildWorkspace();
    const userMessage = buildChatMessage();
    const response: SendMessageSuccessResponse = {
      original_message: userMessage.content,
      response: buildChatMessage({ role: CHAT_ROLE.ASSISTANT }).content,
      raw_response: [
        {
          label: userMessage.content,
          english: buildChatMessage().content,
          japanese: buildChatMessage().content,
        },
      ],
    };
    mockedPost.mockResolvedValue(createResponse(response));
    const { result } = renderHook(() => useMessage(), {
      wrapper: createWrapper(),
    });

    // 2. ACT
    let returnedResponse: SendMessageSuccessResponse | undefined;
    await act(async () => {
      returnedResponse = await result.current.sendMessage({
        workspaceId: workspace.id,
        message: userMessage.content,
      });
    });

    // 3. ASSERT
    expect(mockedPost).toHaveBeenCalledWith(CHAT_ENDPOINTS.send, {
      workspace_id: workspace.id,
      message: userMessage.content,
    });
    expect(returnedResponse).toEqual(response);

    const messages = useChatStore
      .getState()
      .messageOrder.map((id) => useChatStore.getState().messages[id]);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: CHAT_ROLE.USER,
      content: userMessage.content,
      status: CHAT_STATUS.PENDING,
    });
    expect(messages[1]).toMatchObject({
      role: CHAT_ROLE.ASSISTANT,
      content: response.response,
      status: CHAT_STATUS.COMPLETED,
      results: response.raw_response,
    });
  });

  it("persists validation detail text and shows it in an error toast", async () => {
    // 1. ARRANGE
    const workspace = buildWorkspace();
    const userMessage = buildChatMessage();
    const detailMessage = buildChatMessage().content;
    const apiError = {
      response: {
        data: {
          detail: [
            {
              loc: ["body", "message"],
              msg: detailMessage,
              type: "value_error",
            },
          ],
        },
      },
    };
    mockedPost.mockRejectedValue(apiError);
    const { result } = renderHook(() => useMessage(), {
      wrapper: createWrapper(),
    });

    // 2. ACT
    await act(async () => {
      await expect(
        result.current.sendMessage({
          workspaceId: workspace.id,
          message: userMessage.content,
        }),
      ).rejects.toBe(apiError);
    });

    // 3. ASSERT
    expect(mockedToastError).toHaveBeenCalledWith("Failed to send message", {
      description: detailMessage,
    });
    expect(useChatStore.getState().messages).toEqual(
      expect.objectContaining({
        [useChatStore.getState().messageOrder[1]]: expect.objectContaining({
          role: CHAT_ROLE.ASSISTANT,
          content: detailMessage,
          status: CHAT_STATUS.ERROR,
        }),
      }),
    );
  });

  it("uses the generic message for malformed or network errors", async () => {
    // 1. ARRANGE
    const workspace = buildWorkspace();
    const userMessage = buildChatMessage();
    const networkError = {};
    mockedPost.mockRejectedValue(networkError);
    const { result } = renderHook(() => useMessage(), {
      wrapper: createWrapper(),
    });

    // 2. ACT
    await act(async () => {
      await expect(
        result.current.sendMessage({
          workspaceId: workspace.id,
          message: userMessage.content,
        }),
      ).rejects.toBe(networkError);
    });

    // 3. ASSERT
    expect(mockedToastError).toHaveBeenCalledWith("Failed to send message", {
      description: "Failed to send message",
    });
    const state = useChatStore.getState();
    const errorMessage = state.messages[state.messageOrder[1]];
    expect(errorMessage).toMatchObject({
      role: CHAT_ROLE.ASSISTANT,
      content: "Failed to send message",
      status: CHAT_STATUS.ERROR,
    });
  });

  it("shows isPending and keeps only the pending user message before the response resolves", async () => {
    // 1. ARRANGE
    const workspace = buildWorkspace();
    const userMessage = buildChatMessage();
    const response: SendMessageSuccessResponse = {
      original_message: userMessage.content,
      response: buildChatMessage({ role: CHAT_ROLE.ASSISTANT }).content,
      raw_response: [],
    };
    let resolveRequest!: (value: AxiosResponse<typeof response>) => void;
    mockedPost.mockImplementation(
      () =>
        new Promise<AxiosResponse<typeof response>>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const { result } = renderHook(() => useMessage(), {
      wrapper: createWrapper(),
    });

    // 2. ACT
    let requestPromise!: Promise<typeof response>;
    act(() => {
      requestPromise = result.current.sendMessage({
        workspaceId: workspace.id,
        message: userMessage.content,
      });
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));

    // 3. ASSERT
    expect(useChatStore.getState().messageOrder).toHaveLength(1);
    expect(
      useChatStore.getState().messages[useChatStore.getState().messageOrder[0]],
    ).toMatchObject({
      role: CHAT_ROLE.USER,
      status: CHAT_STATUS.PENDING,
    });

    // 4. ACT
    await act(async () => {
      resolveRequest(createResponse(response));
      await requestPromise;
    });

    // 5. ASSERT
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(useChatStore.getState().messageOrder).toHaveLength(2);
  });
});
