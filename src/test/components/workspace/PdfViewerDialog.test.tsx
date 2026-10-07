import React, { useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PdfViewerDialog, {
  type LoadedPdf,
} from "@/components/workspace/PdfViewerDialog";

const { mockedToastError } = vi.hoisted(() => ({
  mockedToastError: vi.fn(),
}));
const mockOnDownload = vi.fn();

let resizeObserverCallback: ResizeObserverCallback | null = null;

vi.mock("sonner", () => ({
  toast: { error: mockedToastError },
}));

vi.mock("react-pdf", () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({
    children,
    onLoadSuccess,
  }: {
    children: React.ReactNode;
    onLoadSuccess?: (value: { numPages: number }) => void;
  }) => {
    React.useEffect(() => {
      onLoadSuccess?.({ numPages: 2 });
    }, []);

    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({
    pageNumber,
    width,
    scale,
    onLoadError,
  }: {
    pageNumber: number;
    width?: number;
    scale?: number;
    onLoadError?: (error: Error) => void;
  }) => (
    <div
      data-testid="pdf-page"
      data-page-width={width}
      data-page-scale={scale}
    >
      Rendered page {pageNumber}
      <button
        type="button"
        onClick={() => onLoadError?.(new Error(faker.lorem.sentence()))}
      >
        Trigger render error
      </button>
    </div>
  ),
}));

function buildLoadedPdf(overrides?: Partial<LoadedPdf>): LoadedPdf {
  return {
    documentId: faker.string.uuid(),
    name: faker.system.commonFileName("pdf"),
    data: new Uint8Array([37, 80, 68, 70, 45]),
    ...overrides,
  };
}

function StatefulViewer({ initialPdf }: { initialPdf: LoadedPdf }) {
  const [open, setOpen] = useState(true);
  const [pdf, setPdf] = useState(initialPdf);

  return (
    <>
      <button type="button" onClick={() => setPdf(buildLoadedPdf())}>
        Replace PDF
      </button>
      <button type="button" onClick={() => setOpen(true)}>
        Open PDF
      </button>
      <PdfViewerDialog
        open={open}
        requestedName={pdf.name}
        pdf={pdf}
        isLoading={false}
        hasDownloadError={false}
        onDownload={mockOnDownload}
        isDownloading={false}
        onOpenChange={setOpen}
      />
    </>
  );
}

function PropDrivenViewer({ pdf }: { pdf: LoadedPdf }) {
  const [open, setOpen] = useState(true);

  return (
    <PdfViewerDialog
      open={open}
      requestedName={pdf.name}
      pdf={pdf}
      isLoading={false}
      hasDownloadError={false}
      onDownload={mockOnDownload}
      isDownloading={false}
      onOpenChange={setOpen}
    />
  );
}

function InitiallyClosedViewer({ pdf }: { pdf: LoadedPdf }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open PDF
      </button>
      <PdfViewerDialog
        open={open}
        requestedName={pdf.name}
        pdf={pdf}
        isLoading={false}
        hasDownloadError={false}
        onDownload={mockOnDownload}
        isDownloading={false}
        onOpenChange={setOpen}
      />
    </>
  );
}

describe("PdfViewerDialog", () => {
  beforeEach(() => {
    mockedToastError.mockReset();
    mockOnDownload.mockReset();
    resizeObserverCallback = null;
    vi.stubGlobal(
      "ResizeObserver",
      class MockResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          resizeObserverCallback = callback;
        }

        observe() {}

        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function emitResize(width: number) {
    act(() => {
      resizeObserverCallback?.(
        [{ contentRect: { width } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
  }

  function getPageScale() {
    return Number(screen.getByTestId("pdf-page").getAttribute("data-page-scale"));
  }

  function getPageWidth() {
    return Number(screen.getByTestId("pdf-page").getAttribute("data-page-width"));
  }

  it("renders the first page and navigates between pages", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const pdf = buildLoadedPdf();

    // 2. ACT
    render(
      <PdfViewerDialog
        open
        requestedName={pdf.name}
        pdf={pdf}
        isLoading={false}
        hasDownloadError={false}
        onDownload={mockOnDownload}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("Page 1 of 2")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /next/i }));

    // 3. ASSERT
    expect(screen.getByText("Rendered page 2")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("shows loading while keeping the previous PDF visible", () => {
    // 1. ARRANGE
    const pdf = buildLoadedPdf();

    // 2. ACT
    render(
      <PdfViewerDialog
        open
        requestedName={faker.system.commonFileName("pdf")}
        pdf={pdf}
        isLoading
        hasDownloadError={false}
        onDownload={mockOnDownload}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );

    // 3. ASSERT
    expect(screen.getByText(pdf.name)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("status")
        .some((element) => element.textContent?.includes("Loading ")),
    ).toBe(true);
  });

  it("keeps the initial page width when ResizeObserver reports zero", async () => {
    // 1. ARRANGE
    const pdf = buildLoadedPdf();

    // 2. ACT
    render(
      <PdfViewerDialog
        open
        requestedName={pdf.name}
        pdf={pdf}
        isLoading={false}
        hasDownloadError={false}
        onDownload={mockOnDownload}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("pdf-page")).toBeInTheDocument());
    emitResize(0);

    // 3. ASSERT
    expect(getPageWidth()).toBe(800);
  });

  it("updates the fit-to-width baseline for a valid resize", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const pdf = buildLoadedPdf();

    // 2. ACT
    render(<InitiallyClosedViewer pdf={pdf} />);
    await user.click(screen.getByRole("button", { name: "Open PDF" }));
    await waitFor(() => expect(screen.getByTestId("pdf-page")).toBeInTheDocument());
    emitResize(900);

    // 3. ASSERT
    await waitFor(() => expect(getPageWidth()).toBe(852));
  });

  it("supports bounded zoom steps and reset", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const pdf = buildLoadedPdf();

    // 2. ACT
    render(
      <PdfViewerDialog
        open
        requestedName={pdf.name}
        pdf={pdf}
        isLoading={false}
        hasDownloadError={false}
        onDownload={mockOnDownload}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("pdf-page")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    await user.click(screen.getByRole("button", { name: "Zoom in" }));

    // 3. ASSERT
    expect(getPageScale()).toBe(1.5);
    await user.click(screen.getByRole("button", { name: "Reset zoom to 100%" }));
    expect(getPageScale()).toBe(1);

    for (let index = 0; index < 4; index += 1) {
      await user.click(screen.getByRole("button", { name: "Zoom out" }));
    }
    expect(getPageScale()).toBe(0.5);
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();

    for (let index = 0; index < 6; index += 1) {
      await user.click(screen.getByRole("button", { name: "Zoom in" }));
    }
    expect(getPageScale()).toBe(2);
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
  });

  it("resets page navigation when a different PDF is loaded", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const firstPdf = buildLoadedPdf();
    const secondPdf = buildLoadedPdf();
    const { rerender } = render(<PropDrivenViewer pdf={firstPdf} />);
    await waitFor(() => expect(screen.getByText("Page 1 of 2")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /next/i }));

    // 2. ACT
    rerender(<PropDrivenViewer pdf={secondPdf} />);

    // 3. ASSERT
    await waitFor(() => expect(screen.getByText("Page 1 of 2")).toBeInTheDocument());
  });

  it("resets zoom for a new PDF and preserves it when reopening the same PDF", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const firstPdf = buildLoadedPdf();
    const secondPdf = buildLoadedPdf();
    const { rerender } = render(<PropDrivenViewer pdf={firstPdf} />);
    await waitFor(() => expect(screen.getByTestId("pdf-page")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Zoom in" }));

    // 2. ACT
    rerender(<PropDrivenViewer pdf={secondPdf} />);

    // 3. ASSERT
    await waitFor(() => expect(getPageScale()).toBe(1));
  });

  it("shows a toast and an inline error when rendering fails", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const pdf = buildLoadedPdf();

    // 2. ACT
    render(
      <PdfViewerDialog
        open
        requestedName={pdf.name}
        pdf={pdf}
        isLoading={false}
        hasDownloadError={false}
        onDownload={mockOnDownload}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Trigger render error" }));

    // 3. ASSERT
    expect(mockedToastError).toHaveBeenCalledWith(
      "Failed to render PDF",
      expect.objectContaining({ description: expect.any(String) }),
    );
    expect(screen.getByText("Unable to display this PDF.")).toBeInTheDocument();
  });

  it("downloads the loaded PDF and exposes a saving state", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const pdf = buildLoadedPdf();

    // 2. ACT
    const { rerender } = render(
      <PdfViewerDialog
        open
        requestedName={pdf.name}
        pdf={pdf}
        isLoading={false}
        hasDownloadError={false}
        onDownload={mockOnDownload}
        isDownloading={false}
        onOpenChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Download" }));

    // 3. ASSERT
    expect(mockOnDownload).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Download" }),
    ).toHaveClass("justify-self-end");

    rerender(
      <PdfViewerDialog
        open
        requestedName={pdf.name}
        pdf={pdf}
        isLoading={false}
        hasDownloadError={false}
        onDownload={mockOnDownload}
        isDownloading
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("closes and reopens through the controlled dialog state", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const pdf = buildLoadedPdf();

    // 2. ACT
    render(<StatefulViewer initialPdf={pdf} />);
    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    const closeButton = screen.getByRole("button", {
      name: "Close PDF preview",
    });
    expect(closeButton).toHaveAttribute("data-size", "icon-lg");
    await user.click(closeButton);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open PDF" }));

    // 3. ASSERT
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(getPageScale()).toBe(1.25);
  });
});
