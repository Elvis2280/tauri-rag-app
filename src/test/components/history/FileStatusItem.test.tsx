import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import FileStatusItem from "@/components/history/FileStatusItem";
import apiRag from "@/lib/axios";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { FILE_STATUS } from "@/types/FileTypes";
import { buildHistoryEntry } from "@/test/factories/history.factory";

function renderItem(node: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>,
  );
}

describe("FileStatusItem", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the workspace and original filename, file ID hover title, and page status subtitle", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.OCR_STARTED,
      pageNumber: 2,
      totalPages: 10,
    });

    // 2. ACT
    renderItem(<FileStatusItem {...entry} />);

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
    renderItem(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(screen.getByTitle(entry.file_id)).toHaveTextContent(
      "Workspace: Unknown workspace",
    );
    expect(screen.getByTitle(entry.file_id)).toHaveTextContent("Unknown file");
    expect(
      screen.getByText(`Page: — / — · ${entry.message} · Status: ${entry.status}`),
    ).toBeInTheDocument();
  });

  it("offers cancellation for active files and keeps retry for failed files", () => {
    // 1. ARRANGE
    const active = buildHistoryEntry({ status: FILE_STATUS.OCR_STARTED });
    const failed = buildHistoryEntry({ status: FILE_STATUS.FAILED });

    // 2. ACT
    const activeRender = renderItem(<FileStatusItem {...active} />);

    // 3. ASSERT
    expect(screen.getByRole("button", { name: "Cancel this process" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry this file process" })).not.toBeInTheDocument();

    // 2. ACT
    activeRender.unmount();
    renderItem(<FileStatusItem {...failed} />);

    // 3. ASSERT
    expect(screen.queryByRole("button", { name: "Cancel this process" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry this file process" })).toBeInTheDocument();
  });

  it.each([FILE_STATUS.COMPLETED, FILE_STATUS.CANCELLING, FILE_STATUS.CANCELLED])(
    "does not offer cancellation for %s files",
    (status) => {
      // 1. ARRANGE
      const entry = buildHistoryEntry({ status });

      // 2. ACT
      renderItem(<FileStatusItem {...entry} />);

      // 3. ASSERT
      expect(screen.queryByRole("button", { name: "Cancel this process" })).not.toBeInTheDocument();
    },
  );

  it("renders a translucent primary progress fill for an active step", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      status: FILE_STATUS.OCR_STARTED,
      step: 3,
      stepTotal: 10,
    });

    // 2. ACT
    renderItem(<FileStatusItem {...entry} />);

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
    renderItem(<FileStatusItem {...entry} />);

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
    renderItem(<FileStatusItem {...entry} />);

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
    renderItem(<FileStatusItem {...entry} />);

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
    const { container } = renderItem(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(container.firstElementChild).toHaveClass("bg-destructive/15");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("centers retry feedback and removes the failure tint while submitting", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const entry = buildHistoryEntry({ status: FILE_STATUS.FAILED });
    let finishRetry: () => void = () => {};
    const post = vi.spyOn(apiRag, "post").mockReturnValueOnce(
      new Promise((resolve) => {
        finishRetry = () => resolve({ data: { document_id: entry.file_id } });
      }),
    );
    const { container } = renderItem(<FileStatusItem {...entry} />);
    const retryButton = screen.getByRole("button", { name: "Retry this file process" });

    // 2. ACT
    await user.click(retryButton);
    await user.click(retryButton);

    // 3. ASSERT
    expect(screen.getByRole("status")).toHaveTextContent("Retrying…");
    expect(screen.getByRole("status")).toHaveClass("text-center");
    expect(container.firstElementChild).not.toHaveClass("bg-destructive/15");
    expect(retryButton).toBeDisabled();
    expect(post).toHaveBeenCalledExactlyOnceWith(DOCUMENT_ENDPOINTS.retry(entry.file_id));

    await act(async () => finishRetry());
  });

  it.each([FILE_STATUS.RETRY_QUEUED, FILE_STATUS.RETRY_RUNNING])(
    "centers and wraps the progress message for %s",
    (status) => {
      // 1. ARRANGE
      const entry = buildHistoryEntry({ status });

      // 2. ACT
      const { container } = renderItem(<FileStatusItem {...entry} />);
      const retryMessage = screen.getByRole("status");

      // 3. ASSERT
      expect(retryMessage).toHaveTextContent(entry.message!);
      expect(retryMessage).toHaveClass("text-center", "wrap-anywhere");
      expect(container.firstElementChild).not.toHaveClass("bg-destructive/15");
      expect(screen.queryByRole("button", { name: "Retry this file process" })).not.toBeInTheDocument();
    },
  );

  it("renders an independent placeholder when only the total page count is known", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({
      step: null,
      stepTotal: 12,
      totalPages: 12,
    });

    // 2. ACT
    renderItem(<FileStatusItem {...entry} />);

    // 3. ASSERT
    expect(
      screen.getByText(
        `Page: — / ${entry.totalPages} · ${entry.message} · Status: ${entry.status}`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
