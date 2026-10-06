import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/context/chatStore";
import useMessage from "@/hooks/useMessage";
import { useWorkspaceList } from "@/hooks/useWorkspace";
import { useGlobalContext } from "@/context/GlobalContext";
import MessageBar from "./MessageBar";
import MessageList from "./MessageList";
import EmptyState from "./EmptyState";
import { BrushCleaning  } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export default function ChatSection() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const containerRef = useRef(null as HTMLDivElement | null)
  const {
    loading: workspacesLoading,
    error: workspacesError,
    refetch: refetchWorkspaces,
  } =
    useWorkspaceList({ showErrorToast: false });
  const { sendMessage, isPending } = useMessage();
  const messageOrder = useChatStore((state) => state.messageOrder);
  const workspaceList = useGlobalContext((state) => state.workspaces);

  const clearMessages = useChatStore((s) => s.clearMessages)
  const hasSelectedWorkspace = workspaceList.some(
    (workspace) => workspace.id === workspaceId,
  );

  const handleSend = (content: string) => {
    if (!hasSelectedWorkspace) return;
    void sendMessage({ workspaceId, message: content }).catch(() => undefined);
  };

  const handleSetWorkspace = (workspaceId: string) => {
    window.localStorage.setItem("workspace", workspaceId)
    setWorkspaceId(workspaceId)
  }

  useEffect(() => {
    const storedWorkspace = window.localStorage.getItem("workspace")
    if (storedWorkspace) {
      setWorkspaceId(storedWorkspace)
    }
  }, [])

  const isMessageBarDisabled =
    isPending || workspacesLoading || !!workspacesError || !hasSelectedWorkspace;

  const isNoMessages = messageOrder.length === 0

  return (
    <div ref={containerRef} className="relative flex h-full w-full flex-col ">
      <div className="flex flex-1 flex-col overflow-y-auto">
        {isNoMessages ? (
          <EmptyState />
        ) : (
            <div className="mt-10">
              <MessageList isPending={isPending} />
          </div>
        )}
      </div>
      <div className="absolute right-2 top-2 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              disabled={isNoMessages}
              variant="ghost"
              onClick={clearMessages}
              aria-label="Clear messages"
              className="h-12 w-12 cursor-pointer rounded-full"
            >
              <BrushCleaning aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent hidden={isNoMessages}>
            <p>Clear messages</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <MessageBar
        onSend={handleSend}
        isDisabled={isMessageBarDisabled}
        workspaceId={workspaceId}
        workspaces={workspaceList}
        onWorkspaceChange={handleSetWorkspace}
        workspacesLoading={workspacesLoading}
        workspacesError={workspacesError}
        onRetryWorkspaces={refetchWorkspaces}
      />
    </div>
  );
}
