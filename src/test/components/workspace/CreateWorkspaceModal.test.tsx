import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import CreateWorkspaceModal from "@/components/workspace/CreateWorkspaceModal";

describe("CreateWorkspaceModal", () => {
  it("submits a valid workspace name with Enter and closes", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onClose = vi.fn();
    const workspaceName = faker.word.words({ count: 2 });

    // 2. ACT
    render(<CreateWorkspaceModal isOpen onClose={onClose} />);
    await user.type(screen.getByLabelText("Workspace name"), workspaceName);
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the modal open and shows an error for an empty submission", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onClose = vi.fn();

    // 2. ACT
    render(<CreateWorkspaceModal isOpen onClose={onClose} />);
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByText("Please enter a workspace name"),
    ).toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onClose = vi.fn();

    // 2. ACT
    render(<CreateWorkspaceModal isOpen onClose={onClose} />);
    await user.keyboard("{Escape}");

    // 3. ASSERT
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
