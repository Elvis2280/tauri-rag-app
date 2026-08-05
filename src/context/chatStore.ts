import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage } from "@/types/ChatTypes";

type State = {
  messages: ChatMessage[];
};

type Actions = {
  addMessage: (msg: Omit<ChatMessage, "id" | "createdAt">) => void;
  clearMessages: () => void;
};

export const useChatStore = create<State & Actions>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (msg) =>
        set((s) => ({
          messages: [
            ...s.messages,
            {
              ...msg,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      clearMessages: () => set({ messages: [] }),
    }),
    { name: "rag-chat" },
  ),
);
