import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CancelDocumentButton from "@/components/history/CancelDocumentButton";
import { useHistory } from "@/context/HistoryContext";
import apiRag, { ApiError } from "@/lib/axios";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { toast } from "sonner";
import { FILE_STATUS } from "@/types/FileTypes";
import { buildHistoryEntry } from "@/test/factories/history.factory";

vi.mock("@/lib/axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/axios")>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const mockedGet = vi.mocked(apiRag.get);
const mockedPost = vi.mocked(apiRag.post);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("CancelDocumentButton", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    useHistory.setState({
      entries: [],
      cancellations: {},
      cancellationGeneration: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks for confirmation and cancels only the selected document", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const documentId = faker.string.uuid();
    const filename = faker.system.fileName();
    const message = faker.lorem.sentence();
    mockedPost.mockResolvedValueOnce({
      data: {
        document_id: documentId,
        task_id: faker.string.uuid(),
        status: "cancelling",
        message,
      },
    });
    mockedGet.mockRejectedValueOnce(
      new ApiError({ status: 404, data: { detail: faker.lorem.sentence() } }),
    );
    render(
      <CancelDocumentButton documentId={documentId} filename={filename} />,
      { wrapper: createWrapper() },
    );

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Cancel this process" }));

    // 3. ASSERT
    expect(screen.getByRole("dialog")).toHaveTextContent(filename);
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "permanently delete the document record and its vector database entries",
    );

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Cancel process" }));

    // 3. ASSERT
    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledExactlyOnceWith(
        DOCUMENT_ENDPOINTS.cancel(documentId),
      );
    });
    expect(mockedGet).toHaveBeenCalledWith(DOCUMENT_ENDPOINTS.status(documentId));
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
      "Cancellation requested",
      expect.objectContaining({
        description: message,
        position: "bottom-right",
        richColors: false,
        className: "border-success text-success",
      }),
    );
    await waitFor(() => {
      expect(useHistory.getState().cancellations[documentId]?.phase).toBe("removed");
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps confirmation open and shows a server error when cancellation fails", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const documentId = faker.string.uuid();
    const detail = faker.lorem.sentence();
    mockedPost.mockRejectedValueOnce(
      new ApiError({ status: 422, data: { detail } }),
    );
    render(
      <CancelDocumentButton documentId={documentId} filename={faker.system.fileName()} />,
      { wrapper: createWrapper() },
    );
    await user.click(screen.getByRole("button", { name: "Cancel this process" }));

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Cancel process" }));

    // 3. ASSERT
    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        "Failed to cancel file process",
        expect.objectContaining({ description: detail, richColors: true }),
      );
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("restores the row and reports a cleanup failure from document status", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const entry = buildHistoryEntry();
    const cleanupError = faker.lorem.sentence();
    useHistory.setState({ entries: [entry] });
    mockedPost.mockResolvedValueOnce({
      data: {
        document_id: entry.file_id,
        task_id: faker.string.uuid(),
        status: "cancelling",
        message: faker.lorem.sentence(),
      },
    });
    mockedGet.mockResolvedValueOnce({
      data: {
        document_id: entry.file_id,
        status: "PROGRESS",
        document_record_status: "cancelling",
        error: cleanupError,
        message: cleanupError,
      },
    });
    render(
      <CancelDocumentButton documentId={entry.file_id} filename={entry.originalFilename} />,
      { wrapper: createWrapper() },
    );
    await user.click(screen.getByRole("button", { name: "Cancel this process" }));

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Cancel process" }));

    // 3. ASSERT
    await waitFor(() => {
      expect(useHistory.getState().cancellations[entry.file_id]?.phase).toBe("failed");
    });
    expect(useHistory.getState().entries[0]).toMatchObject({
      status: FILE_STATUS.CANCELLING,
      error: cleanupError,
    });
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      "Unable to finish cancelling this file",
      expect.objectContaining({ description: cleanupError, richColors: true }),
    );
  });
});
