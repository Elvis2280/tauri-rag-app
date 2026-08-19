import { useChatStore } from "@/context/chatStore";
import { CHAT_ROLE, type ChatMessage } from "@/types/ChatTypes";
import MessageBar from "./MessageBar";
import MessageList from "./MessageList";
import EmptyState from "./EmptyState";

export default function ChatSection() {
  const messagesById = useChatStore((state) => state.messages);
  const messageOrder = useChatStore((state) => state.messageOrder);
  const addMessage = useChatStore((s) => s.addMessage);
  const messages = messageOrder.reduce<ChatMessage[]>((orderedMessages, id) => {
    const message = messagesById[id];

    if (message) orderedMessages.push(message);
    return orderedMessages;
  }, []);

  const handleSend = (content: string, id: string) => {
    addMessage({
      role: CHAT_ROLE.USER,
      content,
    }, id);
  };

  return (
    <div className="relative flex h-full w-full flex-col ">
      <div className="flex flex-1 flex-col overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <MessageList messages={messages} />
        )}
      </div>
      <MessageBar onSend={handleSend} isDisabled={false} />
    </div>
  );
}
