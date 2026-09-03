import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import App from "@/App";
import { useWorkspaceList } from "@/hooks/useWorkspace";
import { useCredential } from "@/hooks/useCredential";

vi.mock("@/hooks/useWorkspace", () => ({ useWorkspaceList: vi.fn() }));
vi.mock("@/hooks/useCredential", () => ({ useCredential: vi.fn() }));
vi.mock("@/components/common/Layout", () => ({
  default: () => null,
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
const mockedUseCredential = vi.mocked(useCredential);

describe("App workspace bootstrap", () => {
  beforeEach(() => {
    mockedUseCredential.mockReturnValue({
      loading: false,
      configured: true,
      apiBaseUrl: "",
      error: null,
      configure: vi.fn(),
      clear: vi.fn(),
      refresh: vi.fn(),
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
});
