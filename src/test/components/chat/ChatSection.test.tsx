import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
    mockedSendMessage.mockReset();
    mockedSendMessage.mockResolvedValue({
      original_message: "",
      response: "",
      raw_response: [],
    });
    mockedUseMessage.mockReturnValue({
      sendMessage: mockedSendMessage,
      isPending: false,
      error: null,
    });
    mockedUseWorkspaceList.mockReturnValue({
      data: useGlobalContext.getState().workspaces,
      loading: false,
      error: null,
      refetch: vi.fn(),
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
    await user.selectOptions(screen.getByRole("combobox", { name: "Workspace" }), workspace.id);
    await user.type(screen.getByRole("textbox", { name: "Message" }), message);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    // 3. ASSERT
    expect(screen.getByRole("option", { name: workspace.name })).toBeInTheDocument();
    expect(mockedSendMessage).toHaveBeenCalledWith({
      workspaceId: workspace.id,
      message,
    });
  });
});
