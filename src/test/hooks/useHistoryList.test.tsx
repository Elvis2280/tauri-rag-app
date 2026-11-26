import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiRag from "@/lib/axios";
import { HISTORY_PAGE_SIZE } from "@/constants/history";
import { historyKeys, mapHistoryItem, useHistoryList } from "@/hooks/useHistoryList";
import type { ApiHistoryListItem, ApiHistoryListResponse, HistoryFilters } from "@/types/HistoryTypes";

vi.mock("@/lib/axios", () => ({ default: { get: vi.fn() } }));

const mockedGet = vi.mocked(apiRag.get);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function buildHistoryItem(overrides: Partial<ApiHistoryListItem> = {}): ApiHistoryListItem {
  return {
    document_id: faker.string.uuid(),
    original_filename: faker.system.fileName(),
    workspace_id: faker.string.uuid(),
    workspace_name: faker.company.name(),
    created_at: faker.date.recent().toISOString(),
    status: "completed",
    stage: faker.lorem.word(),
    step: "13/13",
    message: faker.lorem.sentence(),
    page_number: faker.number.int({ min: 1, max: 20 }),
    total_pages: faker.number.int({ min: 20, max: 50 }),
    error: null,
    ...overrides,
  };
}

function buildResponse(overrides: Partial<ApiHistoryListResponse> = {}): ApiHistoryListResponse {
  return { items: [], next_cursor: null, ...overrides };
}

const defaultFilters: HistoryFilters = {
  status: "active",
  workspaceId: null,
  sort: "oldest",
};

describe("useHistoryList", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("requests server filters and reuses a fresh cached filter result", async () => {
    // 1. ARRANGE
    const workspaceId = faker.string.uuid();
    const filtered: HistoryFilters = {
      status: "complete",
      workspaceId,
      sort: "newest",
    };
    mockedGet.mockResolvedValue({ data: buildResponse() });
    const { rerender } = renderHook(
      ({ filters }: { filters: HistoryFilters }) => useHistoryList(filters),
      { initialProps: { filters: defaultFilters }, wrapper: createWrapper() },
    );
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    // 2. ACT
    rerender({ filters: filtered });
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
    rerender({ filters: defaultFilters });

    // 3. ASSERT
    expect(mockedGet).toHaveBeenNthCalledWith(
      1,
      `/history?sort=oldest&status=active&limit=${HISTORY_PAGE_SIZE}`,
    );
    expect(mockedGet).toHaveBeenNthCalledWith(
      2,
      `/history?sort=newest&status=complete&limit=${HISTORY_PAGE_SIZE}&workspace=${workspaceId}`,
    );
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("passes next_cursor to load the next server page", async () => {
    // 1. ARRANGE
    const cursor = faker.string.uuid();
    mockedGet
      .mockResolvedValueOnce({
        data: buildResponse({ items: [buildHistoryItem()], next_cursor: cursor }),
      })
      .mockResolvedValueOnce({ data: buildResponse({ items: [buildHistoryItem()] }) });
    const { result } = renderHook(() => useHistoryList(defaultFilters), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));

    // 2. ACT
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    // 3. ASSERT
    expect(mockedGet).toHaveBeenNthCalledWith(
      2,
      `/history?sort=oldest&status=active&limit=${HISTORY_PAGE_SIZE}&cursor=${cursor}`,
    );
    expect(result.current.data?.pages).toHaveLength(2);
  });

  it("maps the latest server event fields to a history row", () => {
    // 1. ARRANGE
    const item = buildHistoryItem({
      status: "indexing",
      step: "12/13",
      error: null,
    });

    // 2. ACT
    const entry = mapHistoryItem(item);

    // 3. ASSERT
    expect(entry.file_id).toBe(item.document_id);
    expect(entry.workspaceId).toBe(item.workspace_id);
    expect(entry.status).toBe("indexing");
    expect(entry.step).toBe(12);
    expect(entry.stepTotal).toBe(13);
    expect(entry.timestamp).toBe(item.created_at);
  });

  it("exposes the same stable query key for identical filter values", () => {
    // 1. ARRANGE
    const firstFilters = { ...defaultFilters };
    const secondFilters = { ...defaultFilters };

    // 2. ACT
    const firstKey = historyKeys.list(firstFilters);
    const secondKey = historyKeys.list(secondFilters);

    // 3. ASSERT
    expect(firstKey).toEqual(secondKey);
  });
});
