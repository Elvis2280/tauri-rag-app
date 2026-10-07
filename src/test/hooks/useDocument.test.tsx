import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentPdf } from "@/hooks/useDocument";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";

const {
  mockedGetBinary,
  mockedSave,
  mockedToastError,
  mockedToastSuccess,
  mockedWriteFile,
} = vi.hoisted(() => ({
  mockedGetBinary: vi.fn(),
  mockedSave: vi.fn(),
  mockedToastError: vi.fn(),
  mockedToastSuccess: vi.fn(),
  mockedWriteFile: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { getBinary: mockedGetBinary },
  normalizeNativeError: (error: unknown, fallback: string) =>
    error instanceof Error ? error : new Error(fallback),
}));

vi.mock("sonner", () => ({
  toast: { error: mockedToastError, success: mockedToastSuccess },
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: mockedSave,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: mockedWriteFile,
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

describe("useDocumentPdf", () => {
  beforeEach(() => {
    mockedGetBinary.mockReset();
    mockedSave.mockReset();
    mockedToastError.mockReset();
    mockedToastSuccess.mockReset();
    mockedWriteFile.mockReset();
  });

  it("downloads a PDF using the document ID and returns its bytes", async () => {
    // 1. ARRANGE
    const documentId = faker.string.uuid();
    const bytes = new Uint8Array([37, 80, 68, 70, 45]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedGetBinary.mockResolvedValue({ data: bytes });
    const { result } = renderHook(() => useDocumentPdf(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    let downloaded: Uint8Array | undefined;
    await act(async () => {
      downloaded = await result.current.loadPdf(documentId);
    });

    // 3. ASSERT
    expect(downloaded).toBe(bytes);
    expect(mockedGetBinary).toHaveBeenCalledWith(
      DOCUMENT_ENDPOINTS.pdf(documentId),
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("exposes pending state while a PDF request is unresolved", async () => {
    // 1. ARRANGE
    const documentId = faker.string.uuid();
    const bytes = new Uint8Array([37, 80, 68, 70, 45]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let resolveRequest: ((value: { data: Uint8Array }) => void) | undefined;
    mockedGetBinary.mockReturnValue(
      new Promise<{ data: Uint8Array }>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { result } = renderHook(() => useDocumentPdf(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    const request = result.current.loadPdf(documentId);
    await waitFor(() => expect(result.current.isPending).toBe(true));
    resolveRequest?.({ data: bytes });
    await act(async () => {
      await request;
    });

    // 3. ASSERT
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("shows one toast when the PDF request fails", async () => {
    // 1. ARRANGE
    const documentId = faker.string.uuid();
    const errorMessage = faker.lorem.sentence();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedGetBinary.mockRejectedValue(new Error(errorMessage));
    const { result } = renderHook(() => useDocumentPdf(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await expect(result.current.loadPdf(documentId)).rejects.toThrow(
        errorMessage,
      );
    });

    // 3. ASSERT
    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledTimes(1),
    );
    expect(mockedToastError).toHaveBeenCalledWith("Failed to load PDF", {
      description: errorMessage,
    });
    expect(result.current.error).toBe(errorMessage);
  });

  it("saves the loaded PDF through the native Save As dialog", async () => {
    // 1. ARRANGE
    const bytes = new Uint8Array([37, 80, 68, 70, 45]);
    const filename = `${faker.system.fileName()}.pdf`;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedSave.mockResolvedValue(faker.system.filePath());
    mockedWriteFile.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDocumentPdf(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.savePdf({ name: filename, data: bytes });
    });

    // 3. ASSERT
    expect(saved).toBe(true);
    expect(mockedSave).toHaveBeenCalledWith({
      defaultPath: filename,
      filters: [{ name: "PDF document", extensions: ["pdf"] }],
    });
    expect(mockedWriteFile).toHaveBeenCalledWith(
      expect.any(String),
      bytes,
    );
    expect(mockedToastSuccess).toHaveBeenCalledWith("PDF saved successfully");
  });

  it("does not write or toast when the Save As dialog is cancelled", async () => {
    // 1. ARRANGE
    const queryClient = new QueryClient();
    mockedSave.mockResolvedValue(null);
    const { result } = renderHook(() => useDocumentPdf(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.savePdf({
        name: faker.system.fileName(),
        data: new Uint8Array([37, 80, 68, 70, 45]),
      });
    });

    // 3. ASSERT
    expect(saved).toBe(false);
    expect(mockedWriteFile).not.toHaveBeenCalled();
    expect(mockedToastSuccess).not.toHaveBeenCalled();
    expect(mockedToastError).not.toHaveBeenCalled();
  });

  it("exposes saving state while the native write is unresolved", async () => {
    // 1. ARRANGE
    const queryClient = new QueryClient();
    let resolveSave: ((path: string | null) => void) | undefined;
    mockedSave.mockReturnValue(
      new Promise<string | null>((resolve) => {
        resolveSave = resolve;
      }),
    );
    mockedWriteFile.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDocumentPdf(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    const request = result.current.savePdf({
      name: faker.system.fileName(),
      data: new Uint8Array([37, 80, 68, 70, 45]),
    });
    await waitFor(() => expect(result.current.isSaving).toBe(true));
    resolveSave?.(faker.system.filePath());
    await act(async () => {
      await request;
    });

    // 3. ASSERT
    await waitFor(() => expect(result.current.isSaving).toBe(false));
  });

  it("shows one toast when saving the PDF fails", async () => {
    // 1. ARRANGE
    const errorMessage = faker.lorem.sentence();
    const queryClient = new QueryClient();
    mockedSave.mockResolvedValue(faker.system.filePath());
    mockedWriteFile.mockRejectedValue(new Error(errorMessage));
    const { result } = renderHook(() => useDocumentPdf(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await expect(
        result.current.savePdf({
          name: faker.system.fileName(),
          data: new Uint8Array([37, 80, 68, 70, 45]),
        }),
      ).rejects.toThrow(errorMessage);
    });

    // 3. ASSERT
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledTimes(1));
    expect(mockedToastError).toHaveBeenCalledWith("Failed to save PDF", {
      description: errorMessage,
    });
  });
});
