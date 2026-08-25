import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import CreateWorkspaceModal from "@/components/workspace/CreateWorkspaceModal";

describe("CreateWorkspaceModal", () => {
  it("submits a valid workspace name with Enter", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const workspaceName = faker.word.words({ count: 2 });

    // 2. ACT
    render(
      <CreateWorkspaceModal
        isOpen
        onClose={onClose}
        onCreate={onCreate}
        isPending={false}
      />,
    );
    await user.type(screen.getByLabelText("Workspace name"), workspaceName);
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(onCreate).toHaveBeenCalledWith(workspaceName);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the modal open and shows an error for an empty submission", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    // 2. ACT
    render(
      <CreateWorkspaceModal
        isOpen
        onClose={onClose}
        onCreate={onCreate}
        isPending={false}
      />,
    );
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
    expect(
      screen.getByText("Please enter a workspace name"),
    ).toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    // 2. ACT
    render(
      <CreateWorkspaceModal
        isOpen
        onClose={onClose}
        onCreate={onCreate}
        isPending={false}
      />,
    );
    await user.keyboard("{Escape}");

    // 3. ASSERT
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
