import { Button } from "../ui/button";
import { useWorkspaceTree } from "@/hooks/useWorkspace";
import DirectoryViewer from "./DirectoryViewer";

export default function WorkspacePage() {
  const { data, loading, error, refetch } = useWorkspaceTree();

  if (loading) {
    return (
      <div className="w-full h-full p-2" aria-label="Loading workspace tree">
        <div className="my-2 h-10 w-40 animate-pulse rounded bg-muted" />
        <div className="space-y-3 p-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-destructive">
        <p>{error}</p>
        <Button variant="ghost" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <DirectoryViewer workspaces={data ?? []} />
    </div>
  );
}
