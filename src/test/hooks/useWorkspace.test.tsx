import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiRag from "@/lib/axios";
import { toast } from "sonner";
import { useDisableWorkspace, workspaceKeys } from "@/hooks/useWorkspace";
import type { DisableWorkspaceResponse } from "@/types/WorkspaceTypes";

vi.mock("@/lib/axios", () => ({ default: { post: vi.fn() } }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedPost = vi.mocked(apiRag.post);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

function createResponse<T>(data: T): AxiosResponse<T> {
  return { data } as AxiosResponse<T>;
}

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useWorkspace", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedToastSuccess.mockReset();
    mockedToastError.mockReset();
  });

  it("disables a workspace and shows the backend success message", async () => {
    // 1. ARRANGE
    const workspaceId = faker.string.uuid();
    const successMessage = faker.lorem.sentence();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();
    mockedPost.mockResolvedValue(
      createResponse<DisableWorkspaceResponse>({ message: successMessage }),
    );
    const { result } = renderHook(() => useDisableWorkspace(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await result.current.disableWorkspace(workspaceId);
    });

    // 3. ASSERT
    expect(mockedPost).toHaveBeenCalledWith(
      `/workspace/${workspaceId}/disable`,
    );
    expect(mockedToastSuccess).toHaveBeenCalledWith(successMessage);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: workspaceKeys.all,
    });
  });

  it("shows validation messages from a 422 response", async () => {
    // 1. ARRANGE
    const workspaceId = faker.string.uuid();
    const validationMessage = faker.lorem.sentence();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedPost.mockRejectedValue({
      response: {
        status: 422,
        data: {
          detail: [
            {
              loc: [faker.word.sample(), 0],
              msg: validationMessage,
              type: faker.word.sample(),
              input: workspaceId,
              ctx: {},
            },
          ],
        },
      },
    });
    const { result } = renderHook(() => useDisableWorkspace(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await expect(result.current.disableWorkspace(workspaceId)).rejects.toBeDefined();
    });

    // 3. ASSERT
    await waitFor(() => expect(result.current.error).toBe(validationMessage));
    expect(mockedToastError).toHaveBeenCalledWith(
      "Failed to disable workspace",
      { description: validationMessage },
    );
  });

  it("uses the general message for non-422 errors", async () => {
    // 1. ARRANGE
    const workspaceId = faker.string.uuid();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedPost.mockRejectedValue({ response: { status: 500 } });
    const { result } = renderHook(() => useDisableWorkspace(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await expect(result.current.disableWorkspace(workspaceId)).rejects.toBeDefined();
    });

    // 3. ASSERT
    await waitFor(() =>
      expect(result.current.error).toBe("Failed to disable workspace"),
    );
    expect(mockedToastError).toHaveBeenCalledWith(
      "Failed to disable workspace",
      { description: "Failed to disable workspace" },
    );
  });
});
