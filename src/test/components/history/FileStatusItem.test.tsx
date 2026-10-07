import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FileStatusItem from "@/components/history/FileStatusItem";
import { FILE_STATUS } from "@/types/FileTypes";
import { buildHistoryEntry } from "@/test/factories/history.factory";

describe("FileStatusItem", () => {
  it("renders the workspace and original filename, file ID hover title, and page status subtitle", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.OCR_STARTED,
      pageNumber: 2,
      totalPages: 10,
    });

    // 2. ACT
    render(<FileStatusItem {...entry} />);

    // 3. ASSERT
    const titleGroup = screen.getByTitle(entry.file_id);
    const workspaceBadge = screen.getByText(`Workspace: ${entry.workspaceName}`);
    expect(titleGroup).toHaveTextContent(`Workspace: ${entry.workspaceName}`);
    expect(titleGroup).toHaveTextContent(entry.originalFilename!);
    expect(workspaceBadge).toHaveAttribute("data-slot", "badge");
    expect(workspaceBadge).toHaveAttribute("data-variant", "secondary");
    expect(
      screen.getByText(
        `Page: ${entry.pageNumber} / ${entry.totalPages} · ${entry.message} · Status: ${entry.status}`,
      ),
    ).toBeInTheDocument();
  });

  it("renders explicit placeholders when filename or page metadata is unavailable", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      originalFilename: null,
      workspaceName: null,
      pageNumber: null,
      totalPages: null,
    });

    // 2. ACT
    render(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(screen.getByTitle(entry.file_id)).toHaveTextContent(
      "Workspace: Unknown workspace",
    );
    expect(screen.getByTitle(entry.file_id)).toHaveTextContent("Unknown file");
    expect(
      screen.getByText(`Page: — / — · ${entry.message} · Status: ${entry.status}`),
    ).toBeInTheDocument();
  });

  it("renders a translucent primary progress fill for an active step", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.OCR_STARTED,
      step: 3,
      stepTotal: 10,
    });

    // 2. ACT
    render(<FileStatusItem {...entry} />);

    // 3. ASSERT
    const progress = screen.getByRole("progressbar", {
      name: "File processing progress",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "30");
    expect(progress).toHaveStyle({ width: "30%" });
    expect(progress).toHaveClass("bg-primary/10");
    expect(progress).toHaveAttribute("aria-valuetext", "30% complete");
  });

  it("fills the card completely when the current step reaches the total", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.COMPLETED,
      step: 5,
      stepTotal: 5,
    });

    // 2. ACT
    render(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(screen.getByRole("progressbar")).toHaveStyle({ width: "100%" });
  });

  it("clamps progress to the valid percentage range", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.OCR_STARTED,
      step: 12,
      stepTotal: 10,
    });

    // 2. ACT
    render(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(screen.getByRole("progressbar")).toHaveStyle({ width: "100%" });
  });

  it("does not render progress when the total is missing or invalid", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.OCR_STARTED,
      step: 2,
      stepTotal: 0,
    });

    // 2. ACT
    render(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("keeps failed entries red without showing a green progress fill", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.FAILED,
      step: 4,
      stepTotal: 10,
    });

    // 2. ACT
    const { container } = render(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(container.firstElementChild).toHaveClass("bg-destructive/15");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders an independent placeholder when only the total page count is known", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      step: null,
      stepTotal: 12,
      totalPages: 12,
    });

    // 2. ACT
    render(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(
      screen.getByText(
        `Page: — / ${entry.totalPages} · ${entry.message} · Status: ${entry.status}`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
