import { cn } from "@/lib/utils";
import { CHAT_ROLE, type ChatMessage } from "@/types/ChatTypes";

export default function MessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === CHAT_ROLE.USER;

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
