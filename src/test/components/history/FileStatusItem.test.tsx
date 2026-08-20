import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FileStatusItem from "@/components/history/FileStatusItem";
import { FILE_STATUS } from "@/types/FileTypes";
import { buildHistoryEntry } from "@/test/factories/history.factory";

describe("FileStatusItem", () => {
  it("renders a translucent primary progress fill for an active step", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.OCR_STARTED,
      currentStep: 3,
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
    expect(progress).toHaveClass("bg-primary/15");
  });

  it("fills the card completely when the current step reaches the total", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.COMPLETED,
      currentStep: 5,
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
      currentStep: 12,
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
      currentStep: 2,
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
      currentStep: 4,
      stepTotal: 10,
    });

    // 2. ACT
    const { container } = render(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(container.firstElementChild).toHaveClass("bg-destructive/15");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
