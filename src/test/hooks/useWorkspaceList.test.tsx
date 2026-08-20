import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiRag from "@/lib/axios";
import { WORKSPACE_ENDPOINTS } from "@/lib/api/endpoints";
import { useGlobalContext } from "@/context/GlobalContext";
import useWorkspaceList from "@/hooks/useWorkspaceList";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";
import { toast } from "sonner";

vi.mock("@/lib/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const mockedGet = vi.mocked(apiRag.get);
const mockedToastError = vi.mocked(toast.error);

function createResponse<T>(data: T): AxiosResponse<T> {
  return { data } as AxiosResponse<T>;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function QueryWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useWorkspaceList", () => {
  beforeEach(() => {
    useGlobalContext.setState({ workspaces: [] });
    mockedGet.mockReset();
    mockedToastError.mockReset();
  });

  it("fetches the flat workspace list and stores it globally", async () => {
    // 1. ARRANGE
    const workspaces = [buildWorkspaceListItem(), buildWorkspaceListItem()];
    mockedGet.mockResolvedValue(createResponse(workspaces));
    const { result } = renderHook(() => useWorkspaceList(), {
      wrapper: createWrapper(),
    });

    // 2. ACT
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 3. ASSERT
    expect(mockedGet).toHaveBeenCalledWith(WORKSPACE_ENDPOINTS.list);
    expect(result.current.data).toEqual(workspaces);
    expect(useGlobalContext.getState().workspaces).toEqual(workspaces);
  });

  it("shows the extracted API error when loading workspaces fails", async () => {
    // 1. ARRANGE
    const errorMessage = buildWorkspaceListItem().name;
    mockedGet.mockRejectedValue({
      response: { data: { detail: [{ msg: errorMessage }] } },
    });
    const { result } = renderHook(() => useWorkspaceList(), {
      wrapper: createWrapper(),
    });

    // 2. ACT
    await waitFor(() => expect(result.current.error).toBe(errorMessage));

    // 3. ASSERT
    expect(mockedToastError).toHaveBeenCalledWith("Failed to load workspaces", {
      description: errorMessage,
    });
  });

  it("refetches the workspace list when requested", async () => {
    // 1. ARRANGE
    const workspaces = [buildWorkspaceListItem()];
    mockedGet.mockResolvedValue(createResponse(workspaces));
    const { result } = renderHook(() => useWorkspaceList(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    // 2. ACT
    act(() => result.current.refetch());
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));

    // 3. ASSERT
    expect(result.current.data).toEqual(workspaces);
  });
});
