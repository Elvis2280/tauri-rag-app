import { useEffect, useState } from "react";
import { useChatStore } from "@/context/chatStore";
import useMessage from "@/hooks/useMessage";
import useWorkspaceList from "@/hooks/useWorkspaceList";
import { useGlobalContext } from "@/context/GlobalContext";
import MessageBar from "./MessageBar";
import MessageList from "./MessageList";
import EmptyState from "./EmptyState";
import { BrushCleaning  } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export default function ChatSection() {
  const { loading: workspacesLoading, error: workspacesError } =
    useWorkspaceList({ showErrorToast: false });
  const { sendMessage, loading: messageLoading } = useMessage();
  const messageOrder = useChatStore((state) => state.messageOrder);
  const workspaceList = useGlobalContext((state) => state.workspaces);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const clearMessages = useChatStore((s) => s.clearMessages)

  const handleSend = (content: string) => {
    if (!workspaceId) return;
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
    messageLoading || workspacesLoading || !!workspacesError || !workspaceId;

  const isNoMessages = messageOrder.length === 0

  return (
    <div className="relative flex h-full w-full flex-col ">
      <div className="flex flex-1 flex-col overflow-y-auto">
        {isNoMessages ? (
          <EmptyState />
        ) : (
            <div className="mt-10">
              <MessageList />
          </div>
        )}
      </div>
      <div className="py-2 px-1 flex justify-between absolute top-0 w-full bg-background items-center">
        <div className="flex flex-col gap-2 px-6 items-center">
          <label className="flex items-center gap-3 text-sm" htmlFor="chat-workspace">
            <span className="text-muted-foreground">Workspace</span>
            <select
              id="chat-workspace"
              aria-label="Workspace"
              className="min-w-48 h-7 rounded-md border border-input bg-card px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={workspaceId}
              onChange={(event) => handleSetWorkspace(event.target.value)}
              disabled={
                workspacesLoading || !!workspacesError || workspaceList.length === 0
              }
            >
              <option value="">
                {workspacesLoading ? "Loading workspaces…" : "Select a workspace"}
              </option>
              {workspaceList.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          {workspacesError && (
            <p className="text-xs text-destructive">{workspacesError}</p>
          )}
        </div>
        <div className="mr-2">
          <Tooltip>
            <TooltipTrigger disabled={isNoMessages}>
              <Button disabled={isNoMessages} variant={"ghost"} onClick={clearMessages} className=" cursor-pointer w-12 h-12 rounded-full" > <BrushCleaning /> </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Clear messages</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <MessageBar onSend={handleSend} isDisabled={isMessageBarDisabled} />
    </div>
  );
}
