import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CHAT_STATUS, type ChatMessage } from "@/types/ChatTypes";

type State = {
  messages: Record<string, ChatMessage>;
  messageOrder: string[];
};

type Actions = {
  addMessage: (
    message: Omit<ChatMessage, "id" | "createdAt" | "status">,
    id: string,
  ) => void;
  updateMessage: (
    id: string,
    changes: Partial<ChatMessage>
  ) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
};

export const useChatStore = create<State & Actions>()(
  persist(
    (set) => ({
      messages: {},
      messageOrder: [],

      addMessage: (message, id) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [id]: {
              ...message,
              id,
              createdAt: new Date().toISOString(),
              status: CHAT_STATUS.PENDING,
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
    }),
    { name: "rag-chat" },
  ),
);
