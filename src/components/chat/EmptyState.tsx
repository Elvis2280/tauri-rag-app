import { Sparkles } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-4">
      <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles size={40} />
      </div>
      <h1 className="text-4xl font-bold">RAG Chat</h1>
      <p className="text-sm text-muted-foreground">
        Ask anything and let me solve your questions
      </p>
    </div>
  );
}
