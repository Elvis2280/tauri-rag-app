import { beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadSection from "@/components/upload/UploadSection";
import { ACCEPTED_FILE_TYPES } from "@/constants/upload";
import { useFileContext } from "@/context/FileContext";

vi.mock("@/components/upload/UploadModal", () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <div>
      <span data-testid="upload-modal-state">{open ? "open" : "closed"}</span>
      <button type="button" onClick={onClose}>Close upload</button>
    </div>
  ),
}));

describe("UploadSection", () => {
  beforeEach(() => useFileContext.setState({ files: [] }));

  it("configures the backend-supported upload file types", () => {
    // 1. ARRANGE
    const expectedFileTypes = {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
      "application/vnd.oasis.opendocument.presentation": [".odp"],
      "text/csv": [".csv"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    };

    // 2. ACT
    const configuredFileTypes = ACCEPTED_FILE_TYPES;

    // 3. ASSERT
    expect(configuredFileTypes).toEqual(expectedFileTypes);
  });

  it("renders the upload icon with the neon sunlight glow", () => {
    // 1. ARRANGE
    const { container } = render(<UploadSection />);

    // 2. ACT
    const glow = container.querySelector(".neon-sun-glow");

    // 3. ASSERT
    expect(glow).toBeInTheDocument();
  });

  it("opens the upload modal when a file is selected and clears selection on close", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const fileName = faker.system.commonFileName("pdf");
    const file = new File([faker.lorem.word()], fileName, { type: "application/pdf" });
    const { container } = render(<UploadSection />);
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');

    // 2. ACT
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput as HTMLInputElement, file);

    // 3. ASSERT
    expect(screen.getByTestId("upload-modal-state")).toHaveTextContent("open");
    expect(useFileContext.getState().files).toHaveLength(1);

    // 4. ACT
    await user.click(screen.getByRole("button", { name: "Close upload" }));

    // 5. ASSERT
    expect(useFileContext.getState().files).toHaveLength(0);
    expect(screen.getByTestId("upload-modal-state")).toHaveTextContent("closed");
  });
});
