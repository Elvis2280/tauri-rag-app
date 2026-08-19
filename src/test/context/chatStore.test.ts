import { beforeEach, describe, expect, it } from "vitest";
import { useChatStore } from "@/context/chatStore";
import { CHAT_ROLE, CHAT_STATUS } from "@/types/ChatTypes";
import { buildChatMessage } from "@/test/factories/chat.factory";

describe("useChatStore", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, messageOrder: [] });
  });

  it("stores the message under the supplied id and includes that id in the message", () => {
    // 1. ARRANGE
    const { id, content } = buildChatMessage({ role: CHAT_ROLE.USER });

    // 2. ACT
    useChatStore.getState().addMessage({ role: CHAT_ROLE.USER, content }, id);

    // 3. ASSERT
    const state = useChatStore.getState();
    expect(state.messages[id]).toMatchObject({
      id,
      role: CHAT_ROLE.USER,
      content,
      status: CHAT_STATUS.PENDING,
    });
    expect(state.messageOrder).toEqual([id]);
  });
});
