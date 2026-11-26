import type { PropsWithChildren } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHistory } from "@/context/HistoryContext";
import useFileUpload from "@/hooks/useFileUpload";
import { historyKeys } from "@/hooks/useHistoryList";
import apiRag from "@/lib/axios";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";
import type { FileUploadType } from "@/types/FileTypes";
import type { UploadFileSuccessResponse } from "@/types/UploadFileType";

vi.mock("@/lib/axios", () => ({ default: { post: vi.fn(), patch: vi.fn() } }));
vi.mock("sonner", () => ({
  toast: {
    promise: (request: Promise<unknown>) => ({ unwrap: () => request }),
  },
}));

const mockedPost = vi.mocked(apiRag.post);

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useFileUpload", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    useHistory.setState({ entries: [], cancellations: {}, cancellationGeneration: 0 });
  });

  it("adds a successful upload to live progress and invalidates history", async () => {
    // 1. ARRANGE
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const fileId = faker.string.uuid();
    const workspaceId = faker.string.uuid();
    const workspaceName = faker.company.name();
    const filename = faker.system.fileName();
    const file: FileUploadType = {
      id: fileId,
      file: new File([faker.lorem.sentence()], filename, { type: "application/pdf" }),
      status: "file_uploaded",
    };
    const response: UploadFileSuccessResponse = {
      document_id: faker.string.uuid(),
      task_id: faker.string.uuid(),
      workspace_id: workspaceId,
      original_filename: filename,
      mime_type: "application/pdf",
      stored_filename: faker.system.fileName(),
      page_count: faker.number.int({ min: 1, max: 30 }),
      status: "file_uploaded",
      message: faker.lorem.sentence(),
    };
    mockedPost.mockResolvedValue({ data: response });
    const { result } = renderHook(() => useFileUpload(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await result.current.uploadFiles({
        files: [file],
        workspaceId,
        workspaceName,
        replacements: {},
      });
    });

    // 3. ASSERT
    expect(mockedPost).toHaveBeenCalledWith(
      DOCUMENT_ENDPOINTS.upload,
      expect.any(FormData),
    );
    expect(useHistory.getState().entries[0].file_id).toBe(response.document_id);
    expect(useHistory.getState().entries[0].workspaceId).toBe(workspaceId);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: historyKeys.lists() });
  });
});
