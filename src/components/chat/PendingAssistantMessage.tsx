type PendingAssistantMessageProps = {
  status: "queued" | "running";
};

export default function PendingAssistantMessage({
  status,
}: PendingAssistantMessageProps) {
  const label =
    status === "queued"
      ? "Waiting for the assistant"
      : "Assistant is preparing a response";

  return (
    <div
      aria-label={label}
      className="flex w-full justify-start"
      role="status"
    >
      <div className="flex max-w-[75%] items-center gap-1 rounded-2xl border border-border bg-muted px-4 py-3 text-foreground shadow-sm">
        <span className="sr-only">{label}</span>
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
