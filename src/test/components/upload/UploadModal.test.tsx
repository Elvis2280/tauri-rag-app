import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import UploadModal from "@/components/upload/UploadModal";
import { FILE_STATUS } from "@/types/FileTypes";

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
        duplicateFileNames={[]}
        duplicateWorkspaceName=""
        onUploadAnyway={vi.fn()}
        onCancelDuplicateUpload={vi.fn()}
      />,
    );
    screen.getByRole("button", { name: "Upload" }).focus();
    await user.keyboard("{Enter}");

    // 3. ASSERT
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it("keeps the upload dialog open after accepting a duplicate", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const onClose = vi.fn();
    const workspaceId = faker.string.uuid();
    const workspaceName = faker.company.name();
    const fileName = `${faker.string.alpha({ length: 10, casing: "lower" })}.pdf`;
    const file = new File([faker.lorem.word()], fileName, {
      type: "application/pdf",
    });

    function DuplicateUploadHarness() {
      const [duplicateFileNames, setDuplicateFileNames] = useState([fileName]);

      return (
        <UploadModal
          isOpen
          onClose={onClose}
          onUpload={onUpload}
          files={[
            {
              id: faker.string.uuid(),
              file,
              status: FILE_STATUS.FILE_UPLOADED,
            },
          ]}
          workspaceId={workspaceId}
          onWorkspaceChange={vi.fn()}
          onWorkspaceBlur={vi.fn()}
          canUpload={duplicateFileNames.length === 0}
          workspaces={[{ id: workspaceId, name: workspaceName }]}
          duplicateFileNames={duplicateFileNames}
          duplicateWorkspaceName={workspaceName}
          onUploadAnyway={() => setDuplicateFileNames([])}
          onCancelDuplicateUpload={onClose}
        />
      );
    }
    render(<DuplicateUploadHarness />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Upload anyway" }));

    // 3. ASSERT
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeEnabled();
    expect(screen.getByRole("combobox")).toHaveTextContent(workspaceName);
    expect(screen.getByText(fileName)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // 4. ACT
    await user.click(screen.getByRole("button", { name: "Upload" }));

    // 5. ASSERT
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it("delegates duplicate cancellation without submitting", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onCancelDuplicateUpload = vi.fn();
    const fileName = `${faker.string.alpha({ length: 10, casing: "lower" })}.pdf`;

    render(
      <UploadModal
        isOpen
        onClose={vi.fn()}
        onUpload={vi.fn()}
        files={[]}
        workspaceId={faker.string.uuid()}
        onWorkspaceChange={vi.fn()}
        onWorkspaceBlur={vi.fn()}
        canUpload={false}
        workspaces={[]}
        duplicateFileNames={[fileName]}
        duplicateWorkspaceName={faker.company.name()}
        onUploadAnyway={vi.fn()}
        onCancelDuplicateUpload={onCancelDuplicateUpload}
      />,
    );

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // 3. ASSERT
    expect(onCancelDuplicateUpload).toHaveBeenCalledTimes(1);
  });
});
