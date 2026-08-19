import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageBar from "@/components/chat/MessageBar";
import { faker } from "@faker-js/faker";

describe("MessageBar", () => {
  it("renders the default placeholder text", () => {
    // 1. ARRANGE
    const handleSend = vi.fn();

    // 2. ACT
    render(<MessageBar onSend={handleSend} isDisabled={false} />);

    // 3. ASSERT
    expect(
      screen.getByPlaceholderText("Ask me and let me solve your questions"),
    ).toBeInTheDocument();
  });

  it("disables the send button when the textarea is empty", () => {
    // 1. ARRANGE
    const handleSend = vi.fn();

    // 2. ACT
    render(<MessageBar onSend={handleSend} isDisabled={false} />);
    const sendButton = screen.getByRole("button", { name: /send message/i });

    // 3. ASSERT
    expect(sendButton).toBeDisabled();
  });

  it("calls onSend with the trimmed content and clears the textarea when the send button is clicked", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const handleSend = vi.fn();
    const question = faker.lorem.sentence();
    render(<MessageBar onSend={handleSend} isDisabled={false} />);
    const textarea = screen.getByPlaceholderText(
      "Ask me and let me solve your questions",
    );

    // 2. ACT
    await user.type(textarea, question);
    const sendButton = screen.getByRole("button", { name: /send message/i });
    await user.click(sendButton);

    // 3. ASSERT
    expect(handleSend).toHaveBeenCalledTimes(1);
    expect(handleSend).toHaveBeenCalledWith(question, expect.any(String));
    expect(textarea).toHaveValue("");
  });

  it("does not call onSend when the send button is clicked while empty", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const handleSend = vi.fn();
    render(<MessageBar onSend={handleSend} isDisabled={false} />);

    // 2. ACT
    const sendButton = screen.getByRole("button", { name: /send message/i });
    await user.click(sendButton);

    // 3. ASSERT
    expect(handleSend).not.toHaveBeenCalled();
  });

  it("submits on Enter and inserts a newline on Shift+Enter", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const handleSend = vi.fn();
    const question = faker.lorem.sentence();
    render(<MessageBar onSend={handleSend} isDisabled={false} />);
    const textarea = screen.getByPlaceholderText(
      "Ask me and let me solve your questions",
    );

    // 2. ACT
    await user.type(textarea, question);
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(handleSend).toHaveBeenCalledTimes(1);
    expect(handleSend).toHaveBeenCalledWith(question, expect.any(String));

    // 4. ACT
    await user.type(textarea, "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    // 5. ASSERT
    expect(handleSend).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue("line one\n");
  });
});
