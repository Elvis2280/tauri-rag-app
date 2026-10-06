import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageBar from "@/components/chat/MessageBar";
import { faker } from "@faker-js/faker";

const defaultWorkspace = {
  id: faker.string.uuid(),
  name: faker.company.name(),
};

function renderMessageBar(
  overrides: Partial<ComponentProps<typeof MessageBar>> = {},
) {
  return render(
    <MessageBar
      onSend={vi.fn()}
      isDisabled={false}
      workspaceId=""
      workspaces={[defaultWorkspace]}
      onWorkspaceChange={vi.fn()}
      workspacesLoading={false}
      workspacesError={null}
      onRetryWorkspaces={vi.fn()}
      {...overrides}
    />,
  );
}

describe("MessageBar", () => {
  it("renders the default placeholder text", () => {
    // 1. ARRANGE
    const handleSend = vi.fn();

    // 2. ACT
    renderMessageBar({ onSend: handleSend });

    // 3. ASSERT
    expect(
      screen.getByPlaceholderText("Ask me and let me solve your questions…"),
    ).toBeInTheDocument();
  });

  it("renders workspace options and reports the selected workspace", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    const workspace = {
      id: faker.string.uuid(),
      name: faker.company.name(),
    };

    // 2. ACT
    renderMessageBar({
      workspaces: [workspace],
      onWorkspaceChange,
    });
    const workspaceTrigger = screen.getByRole("combobox", {
      name: "Workspace",
    });
    workspaceTrigger.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("option", { name: workspace.name }));

    // 3. ASSERT
    expect(onWorkspaceChange).toHaveBeenCalledWith(workspace.id);
  });

  it("shows loading and empty workspace states in the selector", () => {
    // 1. ARRANGE

    // 2. ACT
    const { rerender } = renderMessageBar({ workspacesLoading: true });

    // 3. ASSERT
    expect(screen.getByRole("combobox", { name: "Workspace" })).toBeDisabled();
    expect(screen.getByText("Loading…")).toBeInTheDocument();

    // 4. ACT
    rerender(
      <MessageBar
        onSend={vi.fn()}
        isDisabled={false}
        workspaceId=""
        workspaces={[]}
        onWorkspaceChange={vi.fn()}
        workspacesLoading={false}
        workspacesError={null}
        onRetryWorkspaces={vi.fn()}
      />,
    );

    // 5. ASSERT
    expect(screen.getByRole("combobox", { name: "Workspace" })).toBeDisabled();
    expect(screen.getByText("No Workspaces")).toBeInTheDocument();
  });

  it("shows a workspace error with a retry action", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const retry = vi.fn();
    const error = faker.lorem.sentence();

    // 2. ACT
    renderMessageBar({
      workspacesError: error,
      onRetryWorkspaces: retry,
    });
    await user.click(screen.getByRole("button", { name: "Retry" }));

    // 3. ASSERT
    expect(screen.getByRole("combobox", { name: "Workspace" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(error);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps long workspace names accessible while constraining the pill width", () => {
    // 1. ARRANGE
    const workspace = {
      id: faker.string.uuid(),
      name: `${faker.company.name()} ${faker.string.alpha({ length: 32 })}`,
    };

    // 2. ACT
    renderMessageBar({
      workspaceId: workspace.id,
      workspaces: [workspace],
    });

    // 3. ASSERT
    const selector = screen.getByRole("combobox", { name: "Workspace" });
    expect(selector).toHaveClass("max-w-56");
    expect(selector).toHaveTextContent(workspace.name);
  });

  it("disables the send button when the textarea is empty", () => {
    // 1. ARRANGE
    const handleSend = vi.fn();

    // 2. ACT
    renderMessageBar({ onSend: handleSend });
    const sendButton = screen.getByRole("button", { name: /send message/i });

    // 3. ASSERT
    expect(sendButton).toBeDisabled();
  });

  it("calls onSend with the trimmed content and clears the textarea when the send button is clicked", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const handleSend = vi.fn();
    const question = faker.lorem.sentence();
    renderMessageBar({ onSend: handleSend });
    const textarea = screen.getByPlaceholderText(
      "Ask me and let me solve your questions…",
    );

    // 2. ACT
    await user.type(textarea, question);
    const sendButton = screen.getByRole("button", { name: /send message/i });
    await user.click(sendButton);

    // 3. ASSERT
    expect(handleSend).toHaveBeenCalledTimes(1);
    expect(handleSend).toHaveBeenCalledWith(question);
    expect(textarea).toHaveValue("");
  });

  it("does not call onSend when the send button is clicked while empty", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const handleSend = vi.fn();
    renderMessageBar({ onSend: handleSend });

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
    renderMessageBar({ onSend: handleSend });
    const textarea = screen.getByPlaceholderText(
      "Ask me and let me solve your questions…",
    );

    // 2. ACT
    await user.type(textarea, question);
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(handleSend).toHaveBeenCalledTimes(1);
    expect(handleSend).toHaveBeenCalledWith(question);

    // 4. ACT
    await user.type(textarea, "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    // 5. ASSERT
    expect(handleSend).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue("line one\n");
  });
});
