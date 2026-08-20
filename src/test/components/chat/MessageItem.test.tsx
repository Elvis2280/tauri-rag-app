import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageItem from "@/components/chat/MessageItem";
import { useChatStore } from "@/context/chatStore";
import { CHAT_ROLE } from "@/types/ChatTypes";
import { buildChatMessage } from "@/test/factories/chat.factory";

describe("MessageItem", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, messageOrder: [] });
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
  });

  it("hides agent results until the full response control is selected", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const result = {
      label: buildChatMessage().content,
      english: buildChatMessage().content,
      japanese: buildChatMessage().content,
    };
    const message = buildChatMessage({
      role: CHAT_ROLE.ASSISTANT,
      results: [result],
    });
    useChatStore.setState({
      messages: { [message.id]: message },
      messageOrder: [message.id],
    });
    render(<MessageItem id={message.id} />);

    // 2. ACT
    const showButton = screen.getByRole("button", {
      name: "(show full response)",
    });
    expect(screen.queryByText(result.label)).not.toBeInTheDocument();
    await user.click(showButton);

    // 3. ASSERT
    expect(screen.getByText(result.label)).toBeInTheDocument();
    expect(screen.getByText(result.english)).toBeInTheDocument();
    expect(screen.getByText(result.japanese)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "(hide full response)" }),
    ).toBeInTheDocument();

    // 4. ACT
    await user.click(
      screen.getByRole("button", { name: "(hide full response)" }),
    );

    // 5. ASSERT
    expect(screen.queryByText(result.label)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "(show full response)" }),
    ).toBeInTheDocument();
  });
});
