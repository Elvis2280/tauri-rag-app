import { describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadWorkspaceSelect from "@/components/upload/UploadWorkspaceSelect";

describe("UploadWorkspaceSelect", () => {
  it("blocks selection while workspace files load", () => {
    // 1. ARRANGE
    const workspace = {
      id: faker.string.uuid(),
      name: faker.company.name(),
    };

    // 2. ACT
    render(
      <UploadWorkspaceSelect
        value=""
        onValueChange={vi.fn()}
        workspaces={[workspace]}
        isLoading
      />,
    );

    // 3. ASSERT
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("shows the tree error and retries loading", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const retry = vi.fn();
    const error = faker.lorem.sentence();

    // 2. ACT
    render(
      <UploadWorkspaceSelect
        value=""
        onValueChange={vi.fn()}
        workspaces={[]}
        loadError={error}
        onRetry={retry}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));

    // 3. ASSERT
    expect(screen.getByRole("alert")).toHaveTextContent(error);
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
