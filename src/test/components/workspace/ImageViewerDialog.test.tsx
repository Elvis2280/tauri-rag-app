import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ImageViewerDialog, {
  type LoadedImage,
} from "@/components/workspace/ImageViewerDialog";

const { mockedToastError } = vi.hoisted(() => ({
  mockedToastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: mockedToastError },
}));

const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

class MockURL extends URL {
  static createObjectURL = mockCreateObjectURL;
  static revokeObjectURL = mockRevokeObjectURL;
}

function buildLoadedImage(overrides?: Partial<LoadedImage>): LoadedImage {
  return {
    fileId: faker.string.uuid(),
    name: faker.system.commonFileName("png"),
    mimeType: "image/png",
    data: new Uint8Array([137, 80, 78, 71]),
    ...overrides,
  };
}

function StatefulImageViewer({ image }: { image: LoadedImage }) {
  const [open, setOpen] = useState(true);

  return (
    <ImageViewerDialog
      open={open}
      requestedName={image.name}
      image={image}
      isLoading={false}
      hasLoadError={false}
      onDownload={vi.fn()}
      isDownloading={false}
      onOpenChange={setOpen}
    />
  );
}

describe("ImageViewerDialog", () => {
  beforeEach(() => {
    mockedToastError.mockReset();
    mockCreateObjectURL.mockReset();
    mockRevokeObjectURL.mockReset();
    mockCreateObjectURL.mockReturnValue("blob:workspace-image");
    vi.stubGlobal("URL", MockURL);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the image and constrains zoom to 50–200% with reset", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const image = buildLoadedImage();
    const onDownload = vi.fn();
    render(
      <ImageViewerDialog
        open
        requestedName={image.name}
        image={image}
        isLoading={false}
        hasLoadError={false}
        onDownload={onDownload}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );

    // 2. ACT
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    await user.click(zoomIn);
    await user.click(zoomIn);
    await user.click(zoomIn);
    await user.click(zoomIn);
    await user.click(zoomIn);

    // 3. ASSERT
    expect(screen.getByRole("img", { name: image.name })).toHaveAttribute(
      "src",
      "blob:workspace-image",
    );
    expect(screen.getByRole("button", { name: "Reset zoom to 100%" })).toHaveTextContent(
      "200%",
    );
    expect(zoomIn).toBeDisabled();

    // 1. ARRANGE
    const resetButton = screen.getByRole("button", {
      name: "Reset zoom to 100%",
    });

    // 2. ACT
    await user.click(resetButton);
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    await user.click(zoomOut);
    await user.click(zoomOut);
    await user.click(zoomOut);
    await user.click(zoomOut);

    // 3. ASSERT
    expect(resetButton).toHaveTextContent("50%");
    expect(zoomOut).toBeDisabled();
  });

  it("shows loading and fetch error states", () => {
    // 1. ARRANGE
    const requestedName = faker.system.commonFileName("png");

    // 2. ACT
    const { rerender } = render(
      <ImageViewerDialog
        open
        requestedName={requestedName}
        image={null}
        isLoading
        hasLoadError={false}
        onDownload={vi.fn()}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Loading image…")).toBeInTheDocument();

    rerender(
      <ImageViewerDialog
        open
        requestedName={requestedName}
        image={null}
        isLoading={false}
        hasLoadError
        onDownload={vi.fn()}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );

    // 3. ASSERT
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to display this image.",
    );
  });

  it("keeps download available when the WebView cannot render the image", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const image = buildLoadedImage();
    const onDownload = vi.fn();
    render(
      <ImageViewerDialog
        open
        requestedName={image.name}
        image={image}
        isLoading={false}
        hasLoadError={false}
        onDownload={onDownload}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );

    // 2. ACT
    fireEvent.error(screen.getByRole("img", { name: image.name }));
    await user.click(screen.getByRole("button", { name: "Download" }));

    // 3. ASSERT
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to display this image.",
    );
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledTimes(1);
  });

  it("revokes the image URL when the dialog closes", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const image = buildLoadedImage();
    render(<StatefulImageViewer image={image} />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Close image preview" }));

    // 3. ASSERT
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:workspace-image");
  });

  it("revokes the previous URL when another image replaces it", async () => {
    // 1. ARRANGE
    const firstImage = buildLoadedImage();
    const secondImage = buildLoadedImage();
    mockCreateObjectURL
      .mockReturnValueOnce("blob:first-image")
      .mockReturnValueOnce("blob:second-image");
    const { rerender } = render(
      <ImageViewerDialog
        open
        requestedName={firstImage.name}
        image={firstImage}
        isLoading={false}
        hasLoadError={false}
        onDownload={vi.fn()}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );

    // 2. ACT
    rerender(
      <ImageViewerDialog
        open
        requestedName={secondImage.name}
        image={secondImage}
        isLoading={false}
        hasLoadError={false}
        onDownload={vi.fn()}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );

    // 3. ASSERT
    await waitFor(() =>
      expect(screen.getByRole("img", { name: secondImage.name })).toHaveAttribute(
        "src",
        "blob:second-image",
      ),
    );
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:first-image");
  });
});
