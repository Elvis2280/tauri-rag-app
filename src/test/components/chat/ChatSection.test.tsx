import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatSection from "@/components/chat/ChatSection";
import { useChatStore } from "@/context/chatStore";
import { useGlobalContext } from "@/context/GlobalContext";
import { buildChatMessage } from "@/test/factories/chat.factory";
import { CHAT_ROLE } from "@/types/ChatTypes";
import useMessage from "@/hooks/useMessage";
import { useWorkspaceList } from "@/hooks/useWorkspace";
import { buildWorkspaceListItem } from "@/test/factories/workspace.factory";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/hooks/useMessage", () => ({ default: vi.fn() }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspaceList: vi.fn() }));

const mockedUseMessage = vi.mocked(useMessage);
const mockedUseWorkspaceList = vi.mocked(useWorkspaceList);
const mockedSendMessage = vi.fn();
const mockedRefetchWorkspaces = vi.fn();

function renderChatSection() {
  return render(
    <TooltipProvider>
      <ChatSection />
    </TooltipProvider>,
  );
}

describe("ChatSection", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, messageOrder: [] });
    useGlobalContext.setState({ workspaces: [buildWorkspaceListItem()] });
    window.localStorage.clear();
    mockedSendMessage.mockReset();
    mockedSendMessage.mockResolvedValue({
      original_message: "",
      response: "",
      raw_response: [],
    });
    mockedRefetchWorkspaces.mockReset();
    mockedUseMessage.mockReturnValue({
      sendMessage: mockedSendMessage,
      isPending: false,
      error: null,
    });
    mockedUseWorkspaceList.mockReturnValue({
      data: useGlobalContext.getState().workspaces,
      loading: false,
      error: null,
      refetch: mockedRefetchWorkspaces,
    });
  });

  it("renders the RAG Chat title in the center when there are no messages", () => {
    // 1. ARRANGE
    renderChatSection();

    // 2. ACT
    const title = screen.getByRole("heading", { name: "RAG Chat" });

    // 3. ASSERT
    expect(title).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders the clear-messages tooltip trigger as one button", () => {
    // 1. ARRANGE

    // 2. ACT
    renderChatSection();

    // 3. ASSERT
    const clearButton = screen.getByRole("button", {
      name: "Clear messages",
    });
    expect(clearButton.querySelector("button")).toBeNull();
  });

  it("renders the message components when there are messages", () => {
    // 1. ARRANGE
    const userMessage = buildChatMessage({
      role: CHAT_ROLE.USER,
      content: "What is RAG?",
    });
    useChatStore.setState({
      messages: { [userMessage.id]: userMessage },
      messageOrder: [userMessage.id],
    });

    // 2. ACT
    renderChatSection();

    // 3. ASSERT
    expect(screen.queryByRole("heading", { name: "RAG Chat" })).not.toBeInTheDocument();
    expect(screen.getByText("What is RAG?")).toBeInTheDocument();
  });

  it("restores the stored workspace in the composer selector", async () => {
    // 1. ARRANGE
    const workspace = useGlobalContext.getState().workspaces[0];
    window.localStorage.setItem("workspace", workspace.id);

    // 2. ACT
    renderChatSection();

    // 3. ASSERT
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Workspace" })).toHaveTextContent(
        workspace.name,
      ),
    );
  });

  it("disables the message bar while a request is loading", () => {
    // 1. ARRANGE
    mockedUseMessage.mockReturnValue({
      sendMessage: mockedSendMessage,
      isPending: true,
      error: null,
    });

    // 2. ACT
    renderChatSection();

    // 3. ASSERT
    expect(screen.getByRole("textbox", { name: "Message" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
  });

  it("shows a temporary assistant status while a response is pending", () => {
    // 1. ARRANGE
    const userMessage = buildChatMessage({ role: CHAT_ROLE.USER });
    useChatStore.setState({
      messages: { [userMessage.id]: userMessage },
      messageOrder: [userMessage.id],
    });
    mockedUseMessage.mockReturnValue({
      sendMessage: mockedSendMessage,
      isPending: true,
      error: null,
    });

    // 2. ACT
    renderChatSection();

    // 3. ASSERT
    expect(
      screen.getByRole("status", {
        name: "Assistant is preparing a response",
      }),
    ).toBeInTheDocument();
  });

  it("renders shared workspace options and sends the selected workspace ID", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const workspace = useGlobalContext.getState().workspaces[0];
    const message = buildChatMessage().content;

    // 2. ACT
    renderChatSection();
    const workspaceTrigger = screen.getByRole("combobox", {
      name: "Workspace",
    });
    workspaceTrigger.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("option", { name: workspace.name }));
    await user.type(screen.getByRole("textbox", { name: "Message" }), message);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    // 3. ASSERT
    expect(screen.getByRole("combobox", { name: "Workspace" })).toHaveTextContent(
      workspace.name,
    );
    expect(mockedSendMessage).toHaveBeenCalledWith({
      workspaceId: workspace.id,
      message,
    });
  });

  it("disables sending and exposes retry when workspaces fail to load", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const error = buildChatMessage().content;
    mockedUseWorkspaceList.mockReturnValue({
      data: useGlobalContext.getState().workspaces,
      loading: false,
      error,
      refetch: mockedRefetchWorkspaces,
    });

    // 2. ACT
    renderChatSection();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    // 3. ASSERT
    expect(screen.getByRole("combobox", { name: "Workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(error);
    expect(mockedRefetchWorkspaces).toHaveBeenCalledTimes(1);
  });
});
