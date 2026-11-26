import type { PropsWithChildren } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useHistory } from "@/context/HistoryContext";
import { useRetryDocument } from "@/hooks/useDocument";
import { historyKeys } from "@/hooks/useHistoryList";
import apiRag, { ApiError } from "@/lib/axios";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { FILE_STATUS } from "@/types/FileTypes";
import { buildHistoryEntry } from "@/test/factories/history.factory";

vi.mock("@/lib/axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/axios")>();
  return { ...actual, default: { post: vi.fn() } };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const mockedPost = vi.mocked(apiRag.post);

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useRetryDocument", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    vi.mocked(toast.error).mockClear();
    useHistory.setState({ entries: [], cancellations: {}, cancellationGeneration: 0 });
  });

  it("retries the selected document and refreshes history queries", async () => {
    // 1. ARRANGE
    const documentId = faker.string.uuid();
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const entry = buildHistoryEntry({
      file_id: documentId,
      status: FILE_STATUS.FAILED,
    });
    useHistory.setState({ entries: [entry] });
    mockedPost.mockResolvedValue({
      data: { document_id: documentId, task_id: faker.string.uuid() },
    });
    const { result } = renderHook(() => useRetryDocument(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await result.current.retryDocument(documentId);
    });

    // 3. ASSERT
    expect(mockedPost).toHaveBeenCalledWith(DOCUMENT_ENDPOINTS.retry(documentId));
    expect(useHistory.getState().entries[0].status).toBe(FILE_STATUS.RETRY_QUEUED);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: historyKeys.lists(),
    });
  });

  it("shows the server error in a neutral toast at the bottom center", async () => {
    // 1. ARRANGE
    const documentId = faker.string.uuid();
    const detail = faker.lorem.sentence();
    mockedPost.mockRejectedValueOnce(new ApiError({ status: 503, data: { detail } }));
    const { result } = renderHook(() => useRetryDocument(), {
      wrapper: createWrapper(new QueryClient()),
    });

    // 2. ACT
    await act(async () => {
      await result.current.retryDocument(documentId);
    });

    // 3. ASSERT
    expect(toast.error).toHaveBeenCalledExactlyOnceWith("Failed to retry file process", {
      description: detail,
      position: "bottom-center",
      richColors: false,
    });
    expect(result.current.isPending).toBe(false);
  });
});
