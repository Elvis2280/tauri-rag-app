import { useState } from "react";
import { FolderOpen, Send } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type WorkspaceOption = {
  id: string;
  name: string;
};

type MessageBarProps = {
  onSend: (content: string) => void;
  isDisabled: boolean;
  workspaceId: string;
  workspaces: WorkspaceOption[];
  onWorkspaceChange: (workspaceId: string) => void;
  workspacesLoading: boolean;
  workspacesError: string | null;
  onRetryWorkspaces: () => void;
};

export default function MessageBar({
  onSend,
  isDisabled,
  workspaceId,
  workspaces,
  onWorkspaceChange,
  workspacesLoading,
  workspacesError,
  onRetryWorkspaces,
}: MessageBarProps) {
  const [value, setValue] = useState<string>("");
  const canSend = value.trim().length > 0;
  const isWorkspaceUnavailable =
    workspacesLoading || !!workspacesError || workspaces.length === 0;
  const workspacePlaceholder = workspacesError
    ? "Workspace Unavailable"
    : workspacesLoading
      ? "Loading…"
      : workspaces.length === 0
        ? "No Workspaces"
        : "Select Workspace";
  const selectValue = isWorkspaceUnavailable ? "" : workspaceId;

  const handleSend = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mb-6 flex justify-center pt-2">
      <div className="flex min-h-28 w-[80%] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex min-h-16 flex-1 items-center gap-4 overflow-hidden px-5 py-4">
          <textarea
            className="h-full min-h-12 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Ask me and let me solve your questions…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message"
            disabled={isDisabled}
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2">
          <Select
            value={selectValue}
            onValueChange={onWorkspaceChange}
            disabled={isWorkspaceUnavailable}
          >
            <SelectTrigger
              aria-label="Workspace"
              title={
                workspaces.find((workspace) => workspace.id === workspaceId)
                  ?.name
              }
              className="h-8 max-w-56 min-w-0 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FolderOpen aria-hidden="true" className="size-3.5 shrink-0" />
              <SelectValue
                placeholder={workspacePlaceholder}
                className="min-w-0 truncate"
              />
            </SelectTrigger>
            <SelectContent align="start" position="popper">
              {!isWorkspaceUnavailable &&
                workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="default"
            size="icon-lg"
            className="cursor-pointer rounded-full"
            onClick={handleSend}
            disabled={!canSend || isDisabled}
            aria-label="Send message"
          >
            <Send aria-hidden="true" size={20} />
          </Button>
        </div>
        {workspacesError && (
          <div className="flex items-center justify-between gap-2 px-3 pb-2 text-xs text-destructive">
            <p role="alert">{workspacesError}</p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onRetryWorkspaces}
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
