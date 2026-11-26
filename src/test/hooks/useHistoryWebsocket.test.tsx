import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { faker } from "@faker-js/faker";
import { toast } from "sonner";
import { useHistoryWebsocket } from "@/hooks/useHistoryWebsocket";
import {
  createWebSocketClient,
  type WebSocketClient,
} from "@/lib/websocket";
import { useHistory } from "@/context/HistoryContext";
import { FILE_STATUS } from "@/types/FileTypes";
import { buildHistoryEntry } from "@/test/factories/history.factory";

vi.mock("@/lib/websocket", () => ({
  createWebSocketClient: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    promise: vi.fn(),
  },
}));

type FakeClient = WebSocketClient & {
  __emitMessage: (message: unknown) => void;
  __emitState: (state: string) => void;
};

function createFakeClient(): FakeClient {
  const messageHandlers: Array<(message: unknown) => void> = [];
  const stateHandlers: Array<(state: string) => void> = [];

  const client: FakeClient = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn((handler) => {
      messageHandlers.push(handler);
      return () => {};
    }),
    send: vi.fn(),
    getState: vi.fn(() => "idle"),
    onStateChange: vi.fn((handler) => {
      stateHandlers.push(handler);
      return () => {};
    }),
    __emitMessage: (message) => {
      for (const handler of messageHandlers) handler(message);
    },
    __emitState: (state) => {
      for (const handler of stateHandlers) handler(state);
    },
  };

  return client;
}

const WS_BASE = "native://document-status";

const mockClients: FakeClient[] = [];
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

describe("useHistoryWebsocket", () => {
  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
    useHistory.setState({ entries: [], cancellations: {}, cancellationGeneration: 0 });
    mockClients.length = 0;
    vi.mocked(createWebSocketClient).mockImplementation(() => {
      const fake = createFakeClient();
      mockClients.push(fake);
      return fake;
    });
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens a WebSocket connection for every non-terminal entry and skips terminal ones", () => {
    // ARRANGE
    const active = buildHistoryEntry();
    const completed = buildHistoryEntry({ status: FILE_STATUS.COMPLETED });
    useHistory.setState({ entries: [active, completed] });

    // ACT
    renderHook(() => useHistoryWebsocket(), { wrapper });

    // ASSERT
    expect(createWebSocketClient).toHaveBeenCalledTimes(1);
    expect(createWebSocketClient).toHaveBeenCalledWith(
      `${WS_BASE}/documents/${active.file_id}/ws`,
      { reconnect: false },
    );
    expect(mockClients).toHaveLength(1);
    expect(mockClients[0].connect).toHaveBeenCalledTimes(1);
  });

  it("opens an independent client for every non-terminal entry", () => {
    // ARRANGE
    const first = buildHistoryEntry();
    const second = buildHistoryEntry();
    useHistory.setState({ entries: [first, second] });

    // ACT
    renderHook(() => useHistoryWebsocket(), { wrapper });

    // ASSERT
    expect(createWebSocketClient).toHaveBeenCalledTimes(2);
    expect(mockClients).toHaveLength(2);
    expect(mockClients[0]).not.toBe(mockClients[1]);
    expect(mockClients[0].connect).toHaveBeenCalledTimes(1);
    expect(mockClients[1].connect).toHaveBeenCalledTimes(1);
  });

  it("updates the matching store entry via updateEntry when a message arrives", () => {
    // ARRANGE
    const entry = buildHistoryEntry();
    const originalFilename = faker.system.fileName();
    const workspaceName = faker.company.name();
    useHistory.setState({ entries: [entry] });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // ACT
    act(() => {
      client.__emitMessage({
        status: FILE_STATUS.OCR_STARTED,
        file_id: entry.file_id,
        original_filename: originalFilename,
        workspace_name: workspaceName,
        step: 3,
        stage: "processing",
        message: "extracting text",
        page_number: 2,
        total_pages: 10,
        step_total: 10,
        result: null,
        error: null,
        timestamp: entry.timestamp,
      });
    });

    // ASSERT
    const updated = useHistory.getState().entries[0];
    expect(updated.status).toBe(FILE_STATUS.OCR_STARTED);
    expect(updated.originalFilename).toBe(originalFilename);
    expect(updated.workspaceName).toBe(workspaceName);
    expect(updated.step).toBe(3);
    expect(updated.stage).toBe("processing");
    expect(updated.message).toBe("extracting text");
    expect(updated.pageNumber).toBe(2);
    expect(updated.totalPages).toBe(10);
    expect(updated.stepTotal).toBe(10);
  });

  it("applies a second WS message after the first update (re-subscribe regression)", () => {
    // ARRANGE
    const entry = buildHistoryEntry();
    const originalFilename = faker.system.fileName();
    const workspaceName = faker.company.name();
    useHistory.setState({ entries: [entry] });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // ACT
    act(() => {
      client.__emitMessage({
        status: FILE_STATUS.OCR_STARTED,
        file_id: entry.file_id,
        original_filename: originalFilename,
        workspace_name: workspaceName,
        step: 2,
        step_total: 10,
        stage: "processing",
        message: "extracting text",
        page_number: 2,
        total_pages: 10,
        result: null,
        error: null,
        timestamp: entry.timestamp,
      });
      client.__emitMessage({
        status: FILE_STATUS.OCR_FINISHED,
        file_id: entry.file_id,
        step: 4,
        stage: "finished",
        message: "text extracted",
        page_number: 4,
        total_pages: 10,
        result: null,
        error: null,
        timestamp: entry.timestamp,
      });
    });

    // ASSERT
    const updated = useHistory.getState().entries[0];
    expect(updated.status).toBe(FILE_STATUS.OCR_FINISHED);
    expect(updated.originalFilename).toBe(originalFilename);
    expect(updated.workspaceName).toBe(workspaceName);
    expect(updated.step).toBe(4);
    expect(updated.stepTotal).toBe(10);
    expect(updated.stage).toBe("finished");
    expect(updated.message).toBe("text extracted");
    expect(updated.pageNumber).toBe(4);
    expect(updated.totalPages).toBe(10);
  });

  it("ignores messages whose file_id does not match the entry and warns about it", () => {
    // ARRANGE
    const entry = buildHistoryEntry();
    useHistory.setState({ entries: [entry] });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // ACT
    act(() => {
      client.__emitMessage({
        status: FILE_STATUS.OCR_STARTED,
        file_id: faker.string.uuid(),
        step: 1,
        stage: "processing",
        message: "wrong file",
        page_number: null,
        total_pages: null,
        result: null,
        error: null,
        timestamp: entry.timestamp,
      });
    });

    // ASSERT
    expect(useHistory.getState().entries[0].status).toBe(
      FILE_STATUS.FILE_UPLOADED,
    );
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  it("disconnects the client when a terminal status message is received", () => {
    // ARRANGE
    const entry = buildHistoryEntry();
    const invalidateHistory = vi.spyOn(queryClient, "invalidateQueries");
    useHistory.setState({ entries: [entry] });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // ACT
    act(() => {
      client.__emitMessage({
        status: FILE_STATUS.COMPLETED,
        file_id: entry.file_id,
        step: 12,
        step_total: 12,
        stage: "finished",
        message: "all done",
        page_number: null,
        total_pages: null,
        result: null,
        error: null,
        timestamp: entry.timestamp,
      });
    });

    // ASSERT
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(useHistory.getState().entries[0].status).toBe(
      FILE_STATUS.COMPLETED,
    );
    expect(invalidateHistory).toHaveBeenCalledWith({
      queryKey: ["history", "list"],
    });
  });

  it("removes a cancelled document and refreshes history and workspace data", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({ status: FILE_STATUS.CANCELLING });
    const resetHistory = vi.spyOn(queryClient, "resetQueries");
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    useHistory.setState({
      entries: [entry],
      cancellations: { [entry.file_id]: { phase: "pending", message: null } },
    });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // 2. ACT
    act(() => {
      client.__emitMessage({
        status: FILE_STATUS.CANCELLED,
        document_id: entry.file_id,
        message: faker.lorem.sentence(),
      });
    });

    // 3. ASSERT
    expect(useHistory.getState().entries).toHaveLength(0);
    expect(useHistory.getState().cancellations[entry.file_id]?.phase).toBe("removed");
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(resetHistory).toHaveBeenCalledWith({ queryKey: ["history", "list"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["workspaces"] });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not turn a cancelling document into a processing failure when its watch closes", () => {
    // 1. ARRANGE
    const entry = buildHistoryEntry({ status: FILE_STATUS.CANCELLING });
    useHistory.setState({
      entries: [entry],
      cancellations: { [entry.file_id]: { phase: "pending", message: null } },
    });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // 2. ACT
    act(() => client.__emitState("closed"));

    // 3. ASSERT
    expect(toast.error).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(useHistory.getState().entries[0].status).toBe(FILE_STATUS.CANCELLING);
  });

  it("disconnects a watch when its live entry is cleared", () => {
    // ARRANGE
    const entry = buildHistoryEntry();
    useHistory.setState({ entries: [entry] });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // ACT
    act(() => {
      useHistory.getState().removeEntry(entry.file_id);
    });

    // ASSERT
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it("logs the error details, shows the toast and marks the entry as failed on connection error", () => {
    // ARRANGE
    const entry = buildHistoryEntry();
    useHistory.setState({ entries: [entry] });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // ACT
    act(() => {
      client.__emitState("error");
    });

    // ASSERT
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "useHistoryWebsocket: connection error",
      expect.objectContaining({
        file_id: entry.file_id,
        state: "error",
        url: `${WS_BASE}/documents/${entry.file_id}/ws`,
      }),
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Unable to get file's status");
    const updated = useHistory.getState().entries[0];
    expect(updated.status).toBe(FILE_STATUS.FAILED);
    expect(updated.message).toBe("WebSocket disconnected before completion");
  });

  it("handles an unexpected close like a connection error", () => {
    // ARRANGE
    const entry = buildHistoryEntry();
    useHistory.setState({ entries: [entry] });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // ACT
    act(() => {
      client.__emitState("closed");
    });

    // ASSERT
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Unable to get file's status");
    expect(useHistory.getState().entries[0].status).toBe(
      FILE_STATUS.FAILED,
    );
  });

  it("does not toast or log when the connection closes after a terminal message", () => {
    // ARRANGE
    const entry = buildHistoryEntry();
    useHistory.setState({ entries: [entry] });
    renderHook(() => useHistoryWebsocket(), { wrapper });
    const client = mockClients[0];

    // ACT
    act(() => {
      client.__emitMessage({
        status: FILE_STATUS.COMPLETED,
        file_id: entry.file_id,
        step: 12,
        step_total: 12,
        stage: "finished",
        message: "all done",
        page_number: null,
        total_pages: null,
        result: null,
        error: null,
        timestamp: entry.timestamp,
      });
      client.__emitState("closed");
    });

    // ASSERT
    expect(toast.error).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
