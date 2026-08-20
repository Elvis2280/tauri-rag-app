import { useState } from "react";
import { useChatStore } from "@/context/chatStore";
import { cn } from "@/lib/utils";
import { CHAT_ROLE } from "@/types/ChatTypes";
import { Eye, EyeOff } from "lucide-react";

export default function MessageItem({ id }: { id: string }) {
  const message = useChatStore((state) => state.messages[id]);
  const [showResults, setShowResults] = useState(false);

  if (!message) return null;

  const isUser = message.role === CHAT_ROLE.USER;
  const results = message.results ?? [];
  const hasResults = !isUser && results.length > 0;
  const resultsId = `message-results-${message.id}`;

  return (
    <div
      className={cn(
        "flex w-full cursor-pointer",
        isUser ? "justify-end" : "justify-start",
      )}
      onClick={() => setShowResults((isVisible) => !isVisible)}
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
        {hasResults && (
          <div className="mt-3 border-t border-current/15 pt-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs font-medium underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-controls={resultsId}
              aria-expanded={showResults}

            >
              {showResults ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
              <span>
                {showResults
                  ? "(hide full response)"
                  : "(show full response)"}
              </span>
            </button>
            {showResults && (
              <div id={resultsId} className="mt-3 flex flex-col gap-3">
                {results.map((result, index) => (
                  <article
                    key={`${result.label}-${index}`}
                    className="rounded-xl border border-current/15 bg-background/35 p-3"
                  >
                    <p className="font-semibold">{result.label}</p>
                    <div className="mt-2 space-y-2 text-xs leading-5">
                      <div>
                        <p className="font-medium uppercase tracking-wide opacity-70">
                          English
                        </p>
                        <p className="whitespace-pre-wrap break-words">
                          {result.english}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium uppercase tracking-wide opacity-70">
                          日本語
                        </p>
                        <p
                          lang="ja"
                          className="whitespace-pre-wrap break-words"
                        >
                          {result.japanese}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
