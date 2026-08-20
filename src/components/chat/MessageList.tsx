import MessageItem from "./MessageItem";
import { useChatStore } from "@/context/chatStore";

export default function MessageList() {
  const ids = useChatStore((state) => state.messageOrder);

  return (
    <div className="flex w-full flex-col gap-3 overflow-y-auto px-6 py-6">
      {ids.map((id) => (
        <MessageItem key={id} id={id} />
      ))}
    </div>
  );
}
