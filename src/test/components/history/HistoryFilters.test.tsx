import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryFilters from "@/components/history/HistoryFilters";
import { DEFAULT_HISTORY_FILTERS } from "@/constants/history";
import { useGlobalContext } from "@/context/GlobalContext";
import type { HistoryFilters as HistoryFilterValues } from "@/types/HistoryTypes";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";

function HistoryFiltersHarness() {
  const [filters, setFilters] = useState<HistoryFilterValues>(
    DEFAULT_HISTORY_FILTERS,
  );

  return <HistoryFilters filters={filters} onFiltersChange={setFilters} />;
}

describe("HistoryFilters", () => {
  beforeEach(() => {
    useGlobalContext.setState({ workspaces: [] });
  });

  it("defaults to In Process, All workspaces, and Oldest", () => {
    // 1. ARRANGE
    render(<HistoryFiltersHarness />);

    // 2. ACT
    const statusOption = screen.getByRole("radio", { name: "In Process" });

    // 3. ASSERT
    expect(statusOption).toBeChecked();
    expect(screen.getByRole("radio", { name: "Completed" })).not.toBeChecked();
    expect(screen.getByRole("combobox", { name: "Workspace" })).toHaveTextContent("All workspaces");
    expect(screen.getByRole("button", { name: "Newest first" })).toHaveAttribute("aria-pressed", "false");
  });

  it("updates status, workspace, and sort selections", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = buildWorkspaceListItem();
    useGlobalContext.setState({ workspaces: [workspace] });
    render(<HistoryFiltersHarness />);

    // 2. ACT
    await user.click(screen.getByRole("radio", { name: "Completed" }));
    const workspaceSelect = screen.getByRole("combobox", { name: "Workspace" });
    workspaceSelect.focus();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");
    const sortButton = screen.getByRole("button", { name: "Newest first" });
    await user.click(sortButton);

    // 3. ASSERT
    expect(screen.getByRole("radio", { name: "Completed" })).toBeChecked();
    expect(workspaceSelect).toHaveTextContent(workspace.name);
    expect(sortButton).toHaveAttribute("aria-pressed", "true");

    // 4. ACT
    await user.tab({ shift: true });
    await user.keyboard("{Enter}{ArrowUp}{Enter}");

    // 5. ASSERT
    expect(workspaceSelect).toHaveTextContent("All workspaces");
    expect(screen.getByRole("radio", { name: "Completed" })).toBeChecked();
    expect(sortButton).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the current order on hover and toggles with the keyboard", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    render(<HistoryFiltersHarness />);
    const sortButton = screen.getByRole("button", { name: "Newest first" });
    await user.hover(sortButton);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Oldest first");

    // 2. ACT
    sortButton.focus();
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(sortButton).toHaveAttribute("aria-pressed", "true");
    await user.unhover(sortButton);
    await user.hover(sortButton);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Newest first");
  });
});
