import { faker } from "@faker-js/faker";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { useWorkspaceList } from "@/hooks/useWorkspace";
import { useApiAccess } from "@/hooks/useApiAccess";
import { useChatStore } from "@/context/chatStore";
import { useGlobalContext } from "@/context/GlobalContext";
import { buildChatMessage } from "@/test/factories/chat.factory";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";
import { toast } from "sonner";
import type { ConfigurationModalProps } from "@/components/configuration/ConfigurationModal";

const { queryClientRef } = vi.hoisted(() => ({
  queryClientRef: { current: null as QueryClient | null },
}));

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspaceList: vi.fn(),
  workspaceKeys: { all: ["workspaces"] },
}));
vi.mock("@/hooks/useApiAccess", () => ({ useApiAccess: vi.fn() }));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQueryClient: () => queryClientRef.current,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/common/Layout", () => ({
  default: ({ interactive = true }: { interactive?: boolean }) => (
    <div>{interactive ? "Interactive shell" : "Inactive shell"}</div>
  ),
}));
vi.mock("@/components/configuration/ConfigurationModal", () => ({
  default: ({ required = false, onValidateAndClose }: ConfigurationModalProps) => (
    <div>
      {required ? "Required Configuration" : "Optional Configuration"}
      <button onClick={() => void onValidateAndClose()}>Done</button>
    </div>
  ),
}));
vi.mock("@/components/upload/UploadSection", () => ({
  default: () => null,
}));
vi.mock("@/components/workspace/WorkspacePage", () => ({
  default: () => null,
}));
vi.mock("@/components/history/HistorySection", () => ({
  default: () => null,
}));
vi.mock("@/components/chat/ChatSection", () => ({
  default: () => null,
}));
vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

const mockedUseWorkspaceList = vi.mocked(useWorkspaceList);
const mockedUseApiAccess = vi.mocked(useApiAccess);

describe("App workspace bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClientRef.current = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    localStorage.clear();
    useChatStore.getState().clearMessages();
    useGlobalContext.setState({ workspaces: [], selectedWorkspace: null });
    mockedUseApiAccess.mockReturnValue({
      loading: false,
      configured: true,
      setupPending: false,
      serverHost: `${faker.internet.url().replace(/\/$/, "")}/api/v1`,
      error: null,
      refresh: vi.fn(),
      setup: vi.fn(),
      saveApiKey: vi.fn(),
      saveServerHost: vi.fn(),
      finishSetup: vi.fn(),
      checkSavedAccess: vi.fn(),
    });
    mockedUseWorkspaceList.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("starts the shared workspace-list hook on initial render", () => {
    // 1. ARRANGE

    // 2. ACT
    render(<App />);

    // 3. ASSERT
    expect(mockedUseWorkspaceList).toHaveBeenCalledTimes(1);
  });

  it("shows required setup without starting workspace queries when unconfigured", () => {
    // 1. ARRANGE
    mockedUseApiAccess.mockReturnValue({
      loading: false,
      configured: false,
      setupPending: true,
      serverHost: `${faker.internet.url().replace(/\/$/, "")}/api/v1`,
      error: null,
      refresh: vi.fn(),
      setup: vi.fn(),
      saveApiKey: vi.fn(),
      saveServerHost: vi.fn(),
      finishSetup: vi.fn(),
      checkSavedAccess: vi.fn(),
    });

    // 2. ACT
    render(<App />);

    // 3. ASSERT
    expect(screen.getByText("Inactive shell")).toBeInTheDocument();
    expect(screen.getByText("Required Configuration")).toBeInTheDocument();
    expect(mockedUseWorkspaceList).not.toHaveBeenCalled();
  });

  it.each([
    { succeeds: true, required: false },
    { succeeds: false, required: false },
    { succeeds: true, required: true },
    { succeeds: false, required: true },
  ])(
    "clears old environment data (validation succeeds: $succeeds, required setup: $required)",
    async ({ succeeds, required }) => {
      // 1. ARRANGE
      const user = userEvent.setup();
      const workspace = buildWorkspaceListItem();
      const message = buildChatMessage();
      const failure = new Error(faker.lorem.sentence());
      const access = mockedUseApiAccess();
      mockedUseApiAccess.mockReturnValue({ ...access, configured: !required, setupPending: required });
      vi.mocked(access.checkSavedAccess).mockImplementation(async () => {
        expect(useGlobalContext.getState().workspaces).toEqual([]);
        expect(useChatStore.getState().messageOrder).toEqual([]);
        if (!succeeds) throw failure;
        return true;
      });
      useGlobalContext.setState({ workspaces: [workspace], selectedWorkspace: workspace.id });
      useChatStore.getState().addMessage(message, message.id);
      localStorage.setItem("workspace", workspace.id);
      queryClientRef.current!.setQueryData(["workspaces", "list"], [workspace]);
      render(<App />);

      // 2. ACT
      await user.click(screen.getByRole("button", { name: "Done" }));

      // 3. ASSERT
      await waitFor(() => expect(access.checkSavedAccess).toHaveBeenCalledTimes(1));
      expect(useGlobalContext.getState().selectedWorkspace).toBeNull();
      expect(localStorage.getItem("workspace")).toBeNull();
      expect(localStorage.getItem("rag-chat")).toBeNull();
      expect(queryClientRef.current!.getQueryData(["workspaces", "list"])).toBeUndefined();
      expect(succeeds ? toast.success : toast.error).toHaveBeenCalled();
    },
  );
});
