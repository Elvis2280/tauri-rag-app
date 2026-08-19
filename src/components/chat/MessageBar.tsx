import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "../ui/button";

type MessageBarProps = {
  onSend: (content: string, id: string) => void;
  isDisabled: boolean;
};

export default function MessageBar({ onSend, isDisabled }: MessageBarProps) {
  const [value, setValue] = useState<string>("");
  const canSend = value.trim().length > 0;

  const handleSend = () => {
    const id = crypto.randomUUID()
    if (!canSend) return;
    onSend(value.trim(), id);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex justify-center mb-6">
        <div className="w-[80%] flex min-h-24 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex-1 overflow-hidden px-5 py-4 flex items-center gap-4">
            <textarea
              className="h-full w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Ask me and let me solve your questions"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
            aria-label="Message"
            disabled={isDisabled}
            />
            <Button
              variant="default"
              size="icon-lg"
              className="rounded-full"
              onClick={handleSend}
              disabled={!canSend || isDisabled}
            aria-label="Send message"

            >
              <Send size={20} />
            </Button>
          </div>
        </div>
    </div>
  );
}
