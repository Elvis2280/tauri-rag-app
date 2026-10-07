import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentMarkdown } from "@/hooks/useDocumentMarkdown";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";

const { mockedGetBinary, mockedToastError } = vi.hoisted(() => ({
  mockedGetBinary: vi.fn(),
  mockedToastError: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { getBinary: mockedGetBinary },
  normalizeNativeError: (error: unknown, fallback: string) =>
    error instanceof Error ? error : new Error(fallback),
}));

vi.mock("sonner", () => ({
  toast: { error: mockedToastError },
}));

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useDocumentMarkdown", () => {
  beforeEach(() => {
    mockedGetBinary.mockReset();
    mockedToastError.mockReset();
  });

  it("fetches Markdown by file ID and decodes UTF-8 content", async () => {
    // 1. ARRANGE
    const fileId = faker.string.uuid();
    const content = `${faker.lorem.words()} ${faker.location.city()} 日本語`;
    const bytes = new TextEncoder().encode(content);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedGetBinary.mockResolvedValue({ data: bytes });
    const { result } = renderHook(() => useDocumentMarkdown(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    let loadedContent: string | undefined;
    await act(async () => {
      loadedContent = await result.current.loadMarkdown(fileId);
    });

    // 3. ASSERT
    expect(loadedContent).toBe(content);
    expect(mockedGetBinary).toHaveBeenCalledWith(
      DOCUMENT_ENDPOINTS.markdown(fileId),
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("exposes pending state while the Markdown request is unresolved", async () => {
    // 1. ARRANGE
    const fileId = faker.string.uuid();
    const content = faker.lorem.paragraph();
    const bytes = new TextEncoder().encode(content);
    const queryClient = new QueryClient();
    let resolveRequest: ((value: { data: Uint8Array }) => void) | undefined;
    mockedGetBinary.mockReturnValue(
      new Promise<{ data: Uint8Array }>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { result } = renderHook(() => useDocumentMarkdown(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    const request = result.current.loadMarkdown(fileId);
    await waitFor(() => expect(result.current.isPending).toBe(true));
    resolveRequest?.({ data: bytes });
    await act(async () => {
      await request;
    });

    // 3. ASSERT
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("shows one toast when loading Markdown fails", async () => {
    // 1. ARRANGE
    const fileId = faker.string.uuid();
    const errorMessage = faker.lorem.sentence();
    const queryClient = new QueryClient();
    mockedGetBinary.mockRejectedValue(new Error(errorMessage));
    const { result } = renderHook(() => useDocumentMarkdown(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await expect(result.current.loadMarkdown(fileId)).rejects.toThrow(
        errorMessage,
      );
    });

    // 3. ASSERT
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledTimes(1));
    expect(mockedToastError).toHaveBeenCalledWith("Failed to load Markdown", {
      description: errorMessage,
    });
    expect(result.current.error).toBe(errorMessage);
  });
});
