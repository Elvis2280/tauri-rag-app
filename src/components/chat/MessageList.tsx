import type { ChatMessage } from "@/types/ChatTypes";
import MessageItem from "./MessageItem";

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex w-full flex-col gap-3 overflow-y-auto px-6 py-6">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
