import { useChatStore } from "@/context/chatStore";
import { CHAT_ROLE } from "@/types/ChatTypes";
import MessageBar from "./MessageBar";
import MessageList from "./MessageList";
import EmptyState from "./EmptyState";

export default function ChatSection() {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);

  const handleSend = (content: string) => {
    addMessage({ role: CHAT_ROLE.USER, content });
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
      <MessageBar onSend={handleSend} />
    </div>
  );
}
