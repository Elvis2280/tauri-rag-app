export default function PendingAssistantMessage() {
  return (
    <div
      aria-label="Assistant is preparing a response"
      className="flex w-full justify-start"
      role="status"
    >
      <div className="flex max-w-[75%] items-center gap-1 rounded-2xl border border-border bg-muted px-4 py-3 text-foreground shadow-sm">
        <span className="sr-only">Assistant is preparing a response</span>
        <span
          aria-hidden="true"
          className="size-2 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s] motion-reduce:animate-none"
        />
        <span
          aria-hidden="true"
          className="size-2 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s] motion-reduce:animate-none"
        />
        <span
          aria-hidden="true"
          className="size-2 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
        />
      </div>
    </div>
  );
}
