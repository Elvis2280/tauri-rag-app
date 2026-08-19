import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatSection from "@/components/chat/ChatSection";
import { useChatStore } from "@/context/chatStore";
import { buildChatMessage } from "@/test/factories/chat.factory";
import { CHAT_ROLE } from "@/types/ChatTypes";

describe("ChatSection", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, messageOrder: [] });
  });

  it("renders the RAG Chat title in the center when there are no messages", () => {
    // 1. ARRANGE
    render(<ChatSection />);

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
    render(<ChatSection />);

    // 3. ASSERT
    expect(screen.queryByRole("heading", { name: "RAG Chat" })).not.toBeInTheDocument();
    expect(screen.getByText("What is RAG?")).toBeInTheDocument();
  });
});
