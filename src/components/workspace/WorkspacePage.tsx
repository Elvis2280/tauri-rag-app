import { Button } from "../ui/button";
import useWorkspaceTree from "@/hooks/useWorkspaceTree";
import DirectoryViewer from "./DirectoryViewer";

export default function WorkspacePage() {
  const { data, loading, error, refetch } = useWorkspaceTree();

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        Loading workspace tree…
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
