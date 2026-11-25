import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CHAT_STATUS,
  CHAT_ROLE,
  type ChatMessage,
  type ChatStatus,
} from "@/types/ChatTypes";

type State = {
  messages: Record<string, ChatMessage>;
  messageOrder: string[];
  chatTrackingPaused: boolean;
};

type Actions = {
  addMessage: (
    message: Omit<ChatMessage, "id" | "createdAt" | "status">,
    id: string,
    status?: ChatStatus,
  ) => void;
  updateMessage: (
    id: string,
    changes: Partial<ChatMessage>
  ) => void;
  resolvePendingMessage: (
    id: string,
    status: ChatStatus,
    assistantMessage: Omit<ChatMessage, "id" | "createdAt" | "status">,
    assistantId: string,
  ) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  setChatTrackingPaused: (paused: boolean) => void;
};

export const useChatStore = create<State & Actions>()(
  persist(
    (set) => ({
      messages: {},
      messageOrder: [],
      chatTrackingPaused: false,

      addMessage: (message, id, status = CHAT_STATUS.PENDING) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [id]: {
              ...message,
              id,
              createdAt: new Date().toISOString(),
              status,
            },
          },
          messageOrder: [...state.messageOrder, id],
        }));
      },
      updateMessage: (id, changes) => {
        set((state) => {
          const message = state.messages[id];

          if (!message) return state;

          return {
            messages: {
              ...state.messages,
              [id]: { ...message, ...changes },
            },
          };
        });
      },
      resolvePendingMessage: (id, status, assistantMessage, assistantId) => {
        set((state) => {
          const message = state.messages[id];
          if (
            message?.role !== CHAT_ROLE.USER ||
            message.status !== CHAT_STATUS.PENDING
          ) {
            return state;
          }

          const createdAt = new Date().toISOString();
          return {
            messages: {
              ...state.messages,
              [id]: {
                ...message,
                status,
                workspaceId: undefined,
                idempotencyKey: undefined,
                jobId: undefined,
                jobStatus: undefined,
              },
              [assistantId]: {
                ...assistantMessage,
                id: assistantId,
                createdAt,
                status,
              },
            },
            messageOrder: [...state.messageOrder, assistantId],
          };
        });
      },
      removeMessage: (id) => {
        set((state) => {
          if (!state.messages[id]) return state;

          const { [id]: _removedMessage, ...messages } = state.messages;

          return {
            messages,
            messageOrder: state.messageOrder.filter((messageId) => messageId !== id),
          };
        });
      },
      clearMessages: () => set({ messages: {}, messageOrder: [] }),
      setChatTrackingPaused: (paused) => set({ chatTrackingPaused: paused }),
    }),
    {
      name: "rag-chat",
      partialize: (state) => ({
        messages: state.messages,
        messageOrder: state.messageOrder,
      }),
    },
  ),
);
