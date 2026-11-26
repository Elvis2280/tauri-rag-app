import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HistorySection from "@/components/history/HistorySection";
import { useGlobalContext } from "@/context/GlobalContext";
import { useHistory } from "@/context/HistoryContext";
import apiRag from "@/lib/axios";
import { FILE_STATUS } from "@/types/FileTypes";
import type { ApiHistoryListItem, ApiHistoryListResponse } from "@/types/HistoryTypes";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";

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
    status: "file_processing",
    stage: faker.lorem.word(),
    step: "4/13",
    message: faker.lorem.sentence(),
    page_number: faker.number.int({ min: 1, max: 8 }),
    total_pages: faker.number.int({ min: 8, max: 20 }),
    error: null,
    ...overrides,
  };
}

function buildResponse(overrides: Partial<ApiHistoryListResponse> = {}): ApiHistoryListResponse {
  return { items: [], next_cursor: null, ...overrides };
}

describe("HistorySection", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    useHistory.setState({ entries: [], cancellations: {}, cancellationGeneration: 0 });
    useGlobalContext.setState({ workspaces: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a skeleton, keeps server order, and deduplicates overlapping pages", async () => {
    // 1. ARRANGE
    const firstItem = buildHistoryItem();
    const olderItem = buildHistoryItem();
    const cursor = faker.string.uuid();
    mockedGet
      .mockResolvedValueOnce({
        data: buildResponse({ items: [firstItem], next_cursor: cursor }),
      })
      .mockResolvedValueOnce({
        data: buildResponse({ items: [firstItem, olderItem] }),
      });
    const { container } = render(<HistorySection />, { wrapper: createWrapper() });

    // 2. ACT
    expect(screen.getByLabelText("Loading file history")).toBeInTheDocument();
    await screen.findByText(firstItem.original_filename);
    await userEvent.setup().click(screen.getByRole("button", { name: "Load older files" }));
    await screen.findByText(olderItem.original_filename);

    // 3. ASSERT
    expect(screen.getAllByText(firstItem.original_filename)).toHaveLength(1);
    const renderedText = container.textContent ?? "";
    expect(renderedText.indexOf(firstItem.original_filename)).toBeLessThan(
      renderedText.indexOf(olderItem.original_filename),
    );
    expect(mockedGet).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`cursor=${cursor}`),
    );
  });

  it("sends filter changes to the history endpoint", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = buildWorkspaceListItem();
    useGlobalContext.setState({ workspaces: [workspace] });
    mockedGet.mockResolvedValue({ data: buildResponse() });
    render(<HistorySection />, { wrapper: createWrapper() });
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    // 2. ACT
    await user.click(screen.getByRole("radio", { name: "Completed" }));
    const workspaceSelect = screen.getByRole("combobox", { name: "Workspace" });
    workspaceSelect.focus();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Newest first" }));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(4));

    // 3. ASSERT
    expect(mockedGet).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining(
        `sort=newest&status=complete&limit=50&workspace=${workspace.id}`,
      ),
    );
  });

  it("overlays newer live progress on the saved history row", async () => {
    // 1. ARRANGE
    const item = buildHistoryItem({ message: faker.lorem.sentence() });
    const liveMessage = faker.lorem.sentence();
    mockedGet.mockResolvedValue({ data: buildResponse({ items: [item] }) });
    useHistory.setState({
      entries: [
        {
          file_id: item.document_id,
          workspaceId: item.workspace_id,
          originalFilename: item.original_filename,
          workspaceName: item.workspace_name,
          message: liveMessage,
          status: FILE_STATUS.OCR_STARTED,
          timestamp: new Date(Date.now() + 60_000).toISOString(),
          step: 8,
          stage: "ocr_processing",
          pageNumber: item.page_number,
          totalPages: item.total_pages,
          stepTotal: 13,
          error: null,
        },
      ],
    });
    render(<HistorySection />, { wrapper: createWrapper() });

    // 2. ACT
    const row = await screen.findByText((content) => content.includes(liveMessage));

    // 3. ASSERT
    expect(row).toHaveTextContent(FILE_STATUS.OCR_STARTED);
    expect(screen.queryByText(item.message)).not.toBeInTheDocument();
  });

  it("keeps live progress after a later fetch adds an older page", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const item = buildHistoryItem({ message: faker.lorem.sentence() });
    const cursor = faker.string.uuid();
    mockedGet
      .mockResolvedValueOnce({
        data: buildResponse({ items: [item], next_cursor: cursor }),
      })
      .mockResolvedValueOnce({ data: buildResponse() });
    render(<HistorySection />, { wrapper: createWrapper() });
    await screen.findByText(item.original_filename);
    const liveMessage = faker.lorem.sentence();
    const liveTimestamp = new Date(Date.now() + 50).toISOString();
    act(() => {
      useHistory.setState({
        entries: [
          {
            file_id: item.document_id,
            workspaceId: item.workspace_id,
            originalFilename: item.original_filename,
            workspaceName: item.workspace_name,
            message: liveMessage,
            status: FILE_STATUS.OCR_STARTED,
            timestamp: liveTimestamp,
            step: 8,
            stage: "ocr_processing",
            pageNumber: item.page_number,
            totalPages: item.total_pages,
            stepTotal: 13,
            error: null,
          },
        ],
      });
    });
    await screen.findByText((content) => content.includes(liveMessage));

    // 2. ACT
    await new Promise((resolve) => setTimeout(resolve, 75));
    await user.click(screen.getByRole("button", { name: "Load older files" }));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));

    // 3. ASSERT
    expect(await screen.findByText((content) => content.includes(liveMessage))).toBeInTheDocument();
    expect(mockedGet).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`cursor=${cursor}`),
    );
  });

  it("shows the API error and retries the failed request", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const item = buildHistoryItem();
    const errorMessage = faker.lorem.sentence();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGet
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce({ data: buildResponse({ items: [item] }) });
    render(<HistorySection />, { wrapper: createWrapper() });
    expect(await screen.findByRole("alert")).toHaveTextContent(errorMessage);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText(item.original_filename);

    // 3. ASSERT
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("keeps a cancelled document hidden when a cached history response includes it", async () => {
    // 1. ARRANGE
    const item = buildHistoryItem();
    mockedGet.mockResolvedValueOnce({
      data: buildResponse({ items: [item] }),
    });
    useHistory.setState({
      entries: [],
      cancellations: { [item.document_id]: { phase: "removed", message: null } },
    });
    render(<HistorySection />, { wrapper: createWrapper() });

    // 2. ACT
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    // 3. ASSERT
    expect(await screen.findByText("No files found.")).toBeInTheDocument();
    expect(screen.queryByText(item.original_filename)).not.toBeInTheDocument();
  });

  it("hides a server-side cancellation that is still cleaning up after reload", async () => {
    // 1. ARRANGE
    const item = buildHistoryItem({ status: FILE_STATUS.CANCELLING });
    mockedGet.mockResolvedValueOnce({
      data: buildResponse({ items: [item] }),
    });
    render(<HistorySection />, { wrapper: createWrapper() });

    // 2. ACT
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    // 3. ASSERT
    expect(await screen.findByText("No files found.")).toBeInTheDocument();
    expect(screen.queryByText(item.original_filename)).not.toBeInTheDocument();
  });

  it("keeps loaded rows and retries a failed older page with the same cursor", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const currentItem = buildHistoryItem();
    const olderItem = buildHistoryItem();
    const cursor = faker.string.uuid();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGet
      .mockResolvedValueOnce({
        data: buildResponse({ items: [currentItem], next_cursor: cursor }),
      })
      .mockRejectedValueOnce(new Error(faker.lorem.sentence()))
      .mockResolvedValueOnce({ data: buildResponse({ items: [olderItem] }) });
    render(<HistorySection />, { wrapper: createWrapper() });
    await screen.findByText(currentItem.original_filename);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Load older files" }));
    await screen.findByRole("alert");
    expect(screen.getByText(currentItem.original_filename)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry loading older files" }));
    await screen.findByText(olderItem.original_filename);

    // 3. ASSERT
    expect(mockedGet).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`cursor=${cursor}`),
    );
    expect(mockedGet).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(`cursor=${cursor}`),
    );
    expect(screen.getByText(currentItem.original_filename)).toBeInTheDocument();
  });
});
