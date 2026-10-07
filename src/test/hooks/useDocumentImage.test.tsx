import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IMAGE_FILE_FILTER_NAME, IMAGE_MESSAGES } from "@/constants/image";
import { useDocumentImage } from "@/hooks/useDocumentImage";
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

describe("useDocumentImage", () => {
  beforeEach(() => {
    mockedGetBinary.mockReset();
    mockedSave.mockReset();
    mockedToastError.mockReset();
    mockedToastSuccess.mockReset();
    mockedWriteFile.mockReset();
  });

  it("fetches image bytes by file ID", async () => {
    // 1. ARRANGE
    const fileId = faker.string.uuid();
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const queryClient = new QueryClient();
    mockedGetBinary.mockResolvedValue({ data: bytes });
    const { result } = renderHook(() => useDocumentImage(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    let loadedBytes: Uint8Array | undefined;
    await act(async () => {
      loadedBytes = await result.current.loadImage(fileId);
    });

    // 3. ASSERT
    expect(loadedBytes).toBe(bytes);
    expect(DOCUMENT_ENDPOINTS.image(fileId)).toBe(
      `/documents/${fileId}/images`,
    );
    expect(mockedGetBinary).toHaveBeenCalledWith(
      DOCUMENT_ENDPOINTS.image(fileId),
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("reports image request failures", async () => {
    // 1. ARRANGE
    const fileId = faker.string.uuid();
    const errorMessage = faker.lorem.sentence();
    const queryClient = new QueryClient();
    mockedGetBinary.mockRejectedValue(new Error(errorMessage));
    const { result } = renderHook(() => useDocumentImage(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await expect(result.current.loadImage(fileId)).rejects.toThrow(
        errorMessage,
      );
    });

    // 3. ASSERT
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledTimes(1));
    expect(mockedToastError).toHaveBeenCalledWith(IMAGE_MESSAGES.loadError, {
      description: errorMessage,
    });
    expect(result.current.error).toBe(errorMessage);
  });

  it("saves the original bytes with the selected filename and extension", async () => {
    // 1. ARRANGE
    const filename = faker.system.commonFileName("png");
    const path = faker.system.filePath();
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const queryClient = new QueryClient();
    mockedSave.mockResolvedValue(path);
    mockedWriteFile.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDocumentImage(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.saveImage({
        name: filename,
        mimeType: "image/png",
        data: bytes,
      });
    });

    // 3. ASSERT
    expect(saved).toBe(true);
    expect(mockedSave).toHaveBeenCalledWith({
      defaultPath: filename,
      filters: [{ name: IMAGE_FILE_FILTER_NAME, extensions: ["png"] }],
    });
    expect(mockedWriteFile).toHaveBeenCalledWith(path, bytes);
    expect(mockedToastSuccess).toHaveBeenCalledWith(IMAGE_MESSAGES.saveSuccess);
  });

  it("adds a MIME-derived extension when the filename has none", async () => {
    // 1. ARRANGE
    const filename = faker.word.noun();
    const queryClient = new QueryClient();
    mockedSave.mockResolvedValue(null);
    const { result } = renderHook(() => useDocumentImage(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    await act(async () => {
      await result.current.saveImage({
        name: filename,
        mimeType: "image/webp",
        data: new Uint8Array([1]),
      });
    });

    // 3. ASSERT
    expect(mockedSave).toHaveBeenCalledWith({
      defaultPath: `${filename}.webp`,
      filters: [{ name: IMAGE_FILE_FILTER_NAME, extensions: ["webp"] }],
    });
    expect(mockedWriteFile).not.toHaveBeenCalled();
    expect(mockedToastSuccess).not.toHaveBeenCalled();
  });

  it("does not write a file or show success when Save As is cancelled", async () => {
    // 1. ARRANGE
    const queryClient = new QueryClient();
    mockedSave.mockResolvedValue(null);
    const { result } = renderHook(() => useDocumentImage(), {
      wrapper: createWrapper(queryClient),
    });

    // 2. ACT
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.saveImage({
        name: faker.system.commonFileName("png"),
        mimeType: "image/png",
        data: new Uint8Array([1]),
      });
    });

    // 3. ASSERT
    expect(saved).toBe(false);
    expect(mockedWriteFile).not.toHaveBeenCalled();
    expect(mockedToastSuccess).not.toHaveBeenCalled();
  });
});
