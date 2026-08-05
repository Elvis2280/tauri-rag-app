import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import FileStatusItem from "@/components/history/FileStatusItem";
import { FILE_STATUS } from "@/types/FileTypes";
import { buildHistoryEntry } from "@/test/factories/history.factory";

function renderFileStatusItem(status: (typeof FILE_STATUS)[keyof typeof FILE_STATUS]) {
  const entry = buildHistoryEntry({ status });
  const { container } = render(<FileStatusItem {...entry} />);
  return container.firstElementChild?.className ?? "";
}

describe("FileStatusItem", () => {
  it("renders the card with a green ghost background when the entry is completed", () => {
    // 1. ARRANGE
    const status = FILE_STATUS.COMPLETED;

    // 2. ACT
    const className = renderFileStatusItem(status);

    // 3. ASSERT
    expect(className).toContain("bg-success/15");
    expect(className).not.toContain("bg-destructive/15");
  });

  it("renders the card with a red ghost background when the entry is failed", () => {
    // 1. ARRANGE
    const status = FILE_STATUS.FAILED;

    // 2. ACT
    const className = renderFileStatusItem(status);

    // 3. ASSERT
    expect(className).toContain("bg-destructive/15");
    expect(className).not.toContain("bg-success/15");
  });

  it("renders the card without any status tint while the entry is in progress", () => {
    // 1. ARRANGE
    const status = FILE_STATUS.OCR_STARTED;

    // 2. ACT
    const className = renderFileStatusItem(status);

    // 3. ASSERT
    expect(className).not.toContain("bg-success/15");
    expect(className).not.toContain("bg-destructive/15");
  });
});
