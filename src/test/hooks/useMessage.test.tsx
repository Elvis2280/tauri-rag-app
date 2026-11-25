import { act, renderHook } from "@testing-library/react";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it } from "vitest";
import useMessage from "@/hooks/useMessage";
import { useChatStore } from "@/context/chatStore";
import { CHAT_ROLE, CHAT_STATUS } from "@/types/ChatTypes";
import { buildWorkspace } from "@/test/factories/workspace.factory";

describe("useMessage", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, messageOrder: [], chatTrackingPaused: false });
  });

  it("stores a user message with a UUID v4 idempotency key for the job manager", async () => {
    // 1. ARRANGE
    const workspace = buildWorkspace();
    const message = faker.lorem.sentence();
    const { result } = renderHook(() => useMessage());

    // 2. ACT
    await act(async () => {
      await result.current.sendMessage({ workspaceId: workspace.id, message });
    });

    // 3. ASSERT
    const state = useChatStore.getState();
    const storedMessage = state.messages[state.messageOrder[0]];
    expect(state.messageOrder).toHaveLength(1);
    expect(storedMessage).toMatchObject({
      role: CHAT_ROLE.USER,
      content: message,
      workspaceId: workspace.id,
      status: CHAT_STATUS.PENDING,
    });
    expect(storedMessage.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.current.isPending).toBe(true);
  });
});
