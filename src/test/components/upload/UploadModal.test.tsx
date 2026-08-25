import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import UploadModal from "@/components/upload/UploadModal";

describe("UploadModal", () => {
  it("submits through the form when Enter is pressed", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const workspaceId = faker.string.uuid();

    // 2. ACT
    render(
      <UploadModal
        isOpen
        onClose={vi.fn()}
        onUpload={onUpload}
        files={[]}
        workspaceId={workspaceId}
        onWorkspaceChange={vi.fn()}
        onWorkspaceBlur={vi.fn()}
        canUpload
        workspaces={[]}
      />,
    );
    screen.getByRole("button", { name: "Upload" }).focus();
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(onUpload).toHaveBeenCalledTimes(1);
  });
});
