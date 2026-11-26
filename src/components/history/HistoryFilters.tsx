import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HISTORY_ALL_WORKSPACES,
  HISTORY_SORT_LABELS,
} from "@/constants/history";
import { useGlobalContext } from "@/context/GlobalContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { HistoryFilters as HistoryFilterValues } from "@/types/HistoryTypes";

type HistoryFiltersProps = {
  filters: HistoryFilterValues;
  onFiltersChange: (filters: HistoryFilterValues) => void;
};

export default function HistoryFilters({
  filters,
  onFiltersChange,
}: HistoryFiltersProps) {
  const workspaces = useGlobalContext((state) => state.workspaces);
  const newestFirst = filters.sort === "newest";
  const SortIcon = newestFirst ? ArrowDownWideNarrow : ArrowUpNarrowWide;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <fieldset className="m-0 flex w-fit items-center gap-1 rounded-full border border-border bg-muted/30 p-1">
        <legend className="sr-only">History status</legend>
        <label className="cursor-pointer">
          <input
            className="peer sr-only"
            type="radio"
            name="history-status"
            value="active"
            checked={filters.status === "active"}
            onChange={() => onFiltersChange({ ...filters, status: "active" })}
          />
          <span className="block rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors peer-checked:bg-primary peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-ring">
            In Process
          </span>
        </label>
        <label className="cursor-pointer">
          <input
            className="peer sr-only"
            type="radio"
            name="history-status"
            value="complete"
            checked={filters.status === "complete"}
            onChange={() => onFiltersChange({ ...filters, status: "complete" })}
          />
          <span className="block rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors peer-checked:bg-primary peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-ring">
            Completed
          </span>
        </label>
      </fieldset>

      <Select
        value={filters.workspaceId ?? HISTORY_ALL_WORKSPACES}
        onValueChange={(workspaceId) =>
          onFiltersChange({
            ...filters,
            workspaceId:
              workspaceId === HISTORY_ALL_WORKSPACES ? null : workspaceId,
          })
        }
      >
        <SelectTrigger aria-label="Workspace" className="w-56">
          <SelectValue placeholder="All workspaces" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={HISTORY_ALL_WORKSPACES}>All workspaces</SelectItem>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={HISTORY_SORT_LABELS.newest}
              aria-pressed={newestFirst}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  sort: newestFirst ? "oldest" : "newest",
                })
              }
            >
              <SortIcon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{HISTORY_SORT_LABELS[filters.sort]}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
