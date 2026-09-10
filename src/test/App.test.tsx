import { faker } from "@faker-js/faker";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { useWorkspaceList } from "@/hooks/useWorkspace";
import { useApiAccess } from "@/hooks/useApiAccess";

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspaceList: vi.fn(),
  workspaceKeys: { all: ["workspaces"] },
}));
vi.mock("@/hooks/useApiAccess", () => ({ useApiAccess: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/components/common/Layout", () => ({
  default: ({ interactive = true }: { interactive?: boolean }) => (
    <div>{interactive ? "Interactive shell" : "Inactive shell"}</div>
  ),
}));
vi.mock("@/components/auth/ApiAccessModal", () => ({
  default: ({ required = false }: { required?: boolean }) => (
    <div>{required ? "Required API access" : "Optional API access"}</div>
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
    mockedUseApiAccess.mockReturnValue({
      loading: false,
      configured: true,
      serverHost: `${faker.internet.url().replace(/\/$/, "")}/api/v1`,
      error: null,
      refresh: vi.fn(),
      setup: vi.fn(),
      saveApiKey: vi.fn(),
      saveServerHost: vi.fn(),
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
      serverHost: `${faker.internet.url().replace(/\/$/, "")}/api/v1`,
      error: null,
      refresh: vi.fn(),
      setup: vi.fn(),
      saveApiKey: vi.fn(),
      saveServerHost: vi.fn(),
    });

    // 2. ACT
    render(<App />);

    // 3. ASSERT
    expect(screen.getByText("Inactive shell")).toBeInTheDocument();
    expect(screen.getByText("Required API access")).toBeInTheDocument();
    expect(mockedUseWorkspaceList).not.toHaveBeenCalled();
  });
});
