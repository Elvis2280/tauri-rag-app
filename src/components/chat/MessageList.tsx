import MessageItem from "./MessageItem";
import { useChatStore } from "@/context/chatStore";
import PendingAssistantMessage from "./PendingAssistantMessage";
import { CHAT_ROLE, CHAT_STATUS } from "@/types/ChatTypes";

type MessageListProps = {
  isPending: boolean;
};

export default function MessageList({ isPending }: MessageListProps) {
  const ids = useChatStore((state) => state.messageOrder);
  const messages = useChatStore((state) => state.messages);
  const pendingStatus = [...ids]
    .reverse()
    .map((id) => messages[id])
    .find(
      (message) =>
        message?.role === CHAT_ROLE.USER && message.status === CHAT_STATUS.PENDING,
    )?.jobStatus ?? "queued";

  return (
    <div className="flex w-full flex-col gap-3 overflow-y-auto px-6 py-6">
      {ids.map((id) => (
        <MessageItem key={id} id={id} />
      ))}
      {isPending && <PendingAssistantMessage status={pendingStatus} />}
    </div>
  );
}
