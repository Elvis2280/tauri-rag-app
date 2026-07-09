import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type WorkspaceOption = {
  id: string;
  name: string;
};

type UploadWorkspaceSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  workspaces: WorkspaceOption[];
  isLoading?: boolean;
  loadError?: string | null;
};

export default function UploadWorkspaceSelect({
  value,
  onValueChange,
  onBlur,
  error,
  workspaces,
  isLoading,
  loadError,
}: UploadWorkspaceSelectProps) {
  const isDisabled = !!loadError || !!isLoading || workspaces.length === 0;

  const placeholder = loadError
    ? "Failed to load workspaces"
    : isLoading
      ? "Loading workspaces\u2026"
      : workspaces.length === 0
        ? "No workspaces available"
        : "Select a workspace";

  return (
    <div className="flex flex-col gap-1">
      <Select value={value} onValueChange={onValueChange} disabled={isDisabled}>
        <SelectTrigger
          className={cn("w-full", error && "border-b-destructive")}
          onBlur={onBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {!loadError && !isLoading && workspaces.length > 0 && (
            workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
