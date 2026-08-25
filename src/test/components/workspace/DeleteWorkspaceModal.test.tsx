import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import DeleteWorkspaceModal from "@/components/workspace/DeleteWorkspaceModal";

describe("DeleteWorkspaceModal", () => {
  it("requires an explicit click to confirm deletion", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    // 2. ACT
    render(
      <DeleteWorkspaceModal
        isOpen
        workspaceName={faker.word.words({ count: 2 })}
        onClose={onClose}
        onConfirm={onConfirm}
        isPending={false}
      />,
    );
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Delete workspace" }),
    ).toBeInTheDocument();
  });

  it("calls onConfirm when Delete workspace is clicked", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    // 2. ACT
    render(
      <DeleteWorkspaceModal
        isOpen
        workspaceName={faker.word.words({ count: 2 })}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        isPending={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete workspace" }));

    // 3. ASSERT
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
