import MessageSourcePreview from "@/components/chat/MessageSourcePreview";
import { useChatStore } from "@/context/chatStore";
import { cn } from "@/lib/utils";
import { CHAT_ROLE } from "@/types/ChatTypes";

export default function MessageItem({ id }: { id: string }) {
  const message = useChatStore((state) => state.messages[id]);

  if (!message) return null;

  const isUser = message.role === CHAT_ROLE.USER;
  const englishSourceId = !isUser ? message.englishMarkdownId : undefined;
  const japaneseSourceId = !isUser ? message.japaneseMarkdownId : undefined;
  const hasSourcePreview = Boolean(
    englishSourceId ||
      japaneseSourceId ||
      message.sources?.some((source) => source.englishMarkdownId || source.japaneseMarkdownId),
  );

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm",
          isUser
            ? "bg-primary text-background"
            : "border border-border bg-muted text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {hasSourcePreview && (
          <MessageSourcePreview
            englishSourceId={englishSourceId}
            japaneseSourceId={japaneseSourceId}
            sources={message.sources}
          />
        )}
      </div>
    </div>
  );
}
