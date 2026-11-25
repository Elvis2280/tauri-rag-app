import { useCallback } from "react";
import { useChatStore } from "@/context/chatStore";
import { CHAT_ROLE, CHAT_STATUS } from "@/types/ChatTypes";
import type { SendMessageParams } from "@/types/MessageTypes";

export default function useMessage() {
  const messages = useChatStore((state) => state.messages);
  const messageOrder = useChatStore((state) => state.messageOrder);

  const pendingMessage = messageOrder
    .map((id) => messages[id])
    .find(
      (message) =>
        message?.role === CHAT_ROLE.USER && message.status === CHAT_STATUS.PENDING,
    );

  const sendMessage = useCallback(
    async ({ workspaceId, message }: SendMessageParams) => {
      const id = crypto.randomUUID();
      const idempotencyKey = crypto.randomUUID();

      useChatStore.getState().addMessage(
        {
          role: CHAT_ROLE.USER,
          content: message,
          workspaceId,
          idempotencyKey,
        },
        id,
      );
    },
    [],
  );

  return {
    sendMessage,
    isPending: Boolean(pendingMessage),
  };
}
