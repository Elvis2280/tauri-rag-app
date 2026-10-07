import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageItem from "@/components/chat/MessageItem";
import { useChatStore } from "@/context/chatStore";
import { useDocumentMarkdown } from "@/hooks/useDocumentMarkdown";
import { CHAT_ROLE } from "@/types/ChatTypes";
import { buildChatMessage } from "@/test/factories/chat.factory";

vi.mock("@/hooks/useDocumentMarkdown", () => ({
  useDocumentMarkdown: vi.fn(),
}));

const mockedUseDocumentMarkdown = vi.mocked(useDocumentMarkdown);
const mockedLoadMarkdown = vi.fn<(fileId: string) => Promise<string>>();

describe("MessageItem", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, messageOrder: [] });
    mockedLoadMarkdown.mockReset();
    mockedLoadMarkdown.mockResolvedValue("# Source page");
    mockedUseDocumentMarkdown.mockReturnValue({
      loadMarkdown: mockedLoadMarkdown,
      isPending: false,
      error: null,
    });
  });

  it("uses the primary color with dark readable text for user messages", () => {
    // 1. ARRANGE
    const message = buildChatMessage({ role: CHAT_ROLE.USER });
    useChatStore.setState({
      messages: { [message.id]: message },
      messageOrder: [message.id],
    });

    // 2. ACT
    render(<MessageItem id={message.id} />);

    // 3. ASSERT
    const bubble = screen.getByText(message.content).parentElement;
    expect(bubble).toHaveClass("bg-primary", "text-background");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses a bordered gray surface with readable text for agent messages", () => {
    // 1. ARRANGE
    const message = buildChatMessage({ role: CHAT_ROLE.ASSISTANT });
    useChatStore.setState({
      messages: { [message.id]: message },
      messageOrder: [message.id],
    });

    // 2. ACT
    render(<MessageItem id={message.id} />);

    // 3. ASSERT
    const bubble = screen.getByText(message.content).parentElement;
    expect(bubble).toHaveClass("bg-muted", "text-foreground", "border-border");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the matching English and Japanese source pages in the preview dialog", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const message = buildChatMessage({
      role: CHAT_ROLE.ASSISTANT,
      englishMarkdownId: buildChatMessage().id,
      japaneseMarkdownId: buildChatMessage().id,
    });
    useChatStore.setState({
      messages: { [message.id]: message },
      messageOrder: [message.id],
    });
    render(<MessageItem id={message.id} />);

    // 2. ACT
    expect(
      screen.getByRole("button", { name: "Preview English source page" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "日本語の原文ページをプレビュー",
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Preview English source page" }),
    );

    // 3. ASSERT
    expect(mockedLoadMarkdown).toHaveBeenCalledWith(message.englishMarkdownId);
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "English source",
    );
    expect(await screen.findByText("Source page")).toBeInTheDocument();

    // 4. ACT
    await user.click(screen.getByRole("button", { name: "Close Markdown preview" }));
    await user.click(
      screen.getByRole("button", {
        name: "日本語の原文ページをプレビュー",
      }),
    );

    // 5. ASSERT
    expect(mockedLoadMarkdown).toHaveBeenLastCalledWith(
      message.japaneseMarkdownId,
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent("日本語の原文");
  });

  it("shows a loading state and a clear error when the source page cannot load", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const message = buildChatMessage({
      role: CHAT_ROLE.ASSISTANT,
      englishMarkdownId: buildChatMessage().id,
      japaneseMarkdownId: buildChatMessage().id,
    });
    useChatStore.setState({
      messages: { [message.id]: message },
      messageOrder: [message.id],
    });
    let rejectLoad!: (reason?: Error) => void;
    mockedLoadMarkdown.mockImplementation(
      () =>
        new Promise<string>((_resolve, reject) => {
          rejectLoad = reject;
        }),
    );
    render(<MessageItem id={message.id} />);

    // 2. ACT
    await user.click(
      screen.getByRole("button", { name: "Preview English source page" }),
    );

    // 3. ASSERT
    expect(screen.getByText("Loading Markdown…")).toBeInTheDocument();

    // 4. ACT
    rejectLoad(new Error("Unavailable"));

    // 5. ASSERT
    await waitFor(() =>
      expect(
        screen.getByText("Unable to display this Markdown file."),
      ).toBeInTheDocument(),
    );
  });

  it("does not show source controls for older messages without source IDs", () => {
    // 1. ARRANGE
    const message = buildChatMessage({ role: CHAT_ROLE.ASSISTANT });
    useChatStore.setState({
      messages: { [message.id]: message },
      messageOrder: [message.id],
    });

    // 2. ACT
    render(<MessageItem id={message.id} />);

    // 3. ASSERT
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("ignores a source response after closing and switching previews", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const message = buildChatMessage({
      role: CHAT_ROLE.ASSISTANT,
      englishMarkdownId: buildChatMessage().id,
      japaneseMarkdownId: buildChatMessage().id,
    });
    useChatStore.setState({
      messages: { [message.id]: message },
      messageOrder: [message.id],
    });
    let resolveEnglish!: (content: string) => void;
    let resolveJapanese!: (content: string) => void;
    mockedLoadMarkdown.mockImplementation((fileId) => {
      if (fileId === message.englishMarkdownId) {
        return new Promise<string>((resolve) => {
          resolveEnglish = resolve;
        });
      }

      return new Promise<string>((resolve) => {
        resolveJapanese = resolve;
      });
    });
    render(<MessageItem id={message.id} />);

    // 2. ACT
    await user.click(
      screen.getByRole("button", { name: "Preview English source page" }),
    );
    await user.click(screen.getByRole("button", { name: "Close Markdown preview" }));
    await user.click(
      screen.getByRole("button", {
        name: "日本語の原文ページをプレビュー",
      }),
    );
    resolveEnglish("# Late English response");
    resolveJapanese("# Japanese source page");

    // 3. ASSERT
    expect(await screen.findByText("Japanese source page")).toBeInTheDocument();
    expect(screen.queryByText("Late English response")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("日本語の原文");
  });
});
