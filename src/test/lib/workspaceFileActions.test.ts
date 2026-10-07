import { describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import type {
  WorkspaceFileNode,
  WorkspaceFileRole,
} from "@/types/WorkspaceTypes";
import { dispatchWorkspaceFileOpen } from "@/lib/workspaceFileActions";

function buildWorkspaceFile(
  extension: string,
  role: WorkspaceFileRole = "original",
): WorkspaceFileNode {
  return {
    type: "file",
    id: faker.string.uuid(),
    name: `${faker.system.commonFileName("document").replace(/\.[^.]+$/, "")}.${extension}`,
    role,
  };
}

describe("dispatchWorkspaceFileOpen", () => {
  it("routes PDF files to the PDF handler", () => {
    // 1. ARRANGE
    const file = buildWorkspaceFile("PDF");
    const handlers = {
      pdf: vi.fn(),
      markdown: vi.fn(),
      image: vi.fn(),
    };

    // 2. ACT
    const action = dispatchWorkspaceFileOpen(file, handlers);

    // 3. ASSERT
    expect(action).toBe("pdf");
    expect(handlers.pdf).toHaveBeenCalledWith(file);
    expect(handlers.markdown).not.toHaveBeenCalled();
    expect(handlers.image).not.toHaveBeenCalled();
  });

  it("routes Markdown files to the Markdown handler", () => {
    // 1. ARRANGE
    const file = buildWorkspaceFile("md", "translation");
    const handlers = {
      pdf: vi.fn(),
      markdown: vi.fn(),
      image: vi.fn(),
    };

    // 2. ACT
    const action = dispatchWorkspaceFileOpen(file, handlers);

    // 3. ASSERT
    expect(action).toBe("markdown");
    expect(handlers.markdown).toHaveBeenCalledWith(file);
    expect(handlers.pdf).not.toHaveBeenCalled();
    expect(handlers.image).not.toHaveBeenCalled();
  });

  it("routes image files to the image handler", () => {
    // 1. ARRANGE
    const file = buildWorkspaceFile("png", "page");
    const handlers = {
      pdf: vi.fn(),
      markdown: vi.fn(),
      image: vi.fn(),
    };

    // 2. ACT
    const action = dispatchWorkspaceFileOpen(file, handlers);

    // 3. ASSERT
    expect(action).toBe("image");
    expect(handlers.image).toHaveBeenCalledWith(file);
    expect(handlers.pdf).not.toHaveBeenCalled();
    expect(handlers.markdown).not.toHaveBeenCalled();
  });

  it("routes image MIME types even when the filename extension is unfamiliar", () => {
    // 1. ARRANGE
    const file = buildWorkspaceFile("data", "page");
    file.mimeType = "image/webp";
    const handlers = {
      pdf: vi.fn(),
      markdown: vi.fn(),
      image: vi.fn(),
    };

    // 2. ACT
    const action = dispatchWorkspaceFileOpen(file, handlers);

    // 3. ASSERT
    expect(action).toBe("image");
    expect(handlers.image).toHaveBeenCalledWith(file);
  });

  it("leaves unsupported file types without an open handler", () => {
    // 1. ARRANGE
    const file = buildWorkspaceFile("docx");
    const handlers = {
      pdf: vi.fn(),
      markdown: vi.fn(),
      image: vi.fn(),
    };

    // 2. ACT
    const action = dispatchWorkspaceFileOpen(file, handlers);

    // 3. ASSERT
    expect(action).toBeNull();
    expect(handlers.pdf).not.toHaveBeenCalled();
    expect(handlers.markdown).not.toHaveBeenCalled();
    expect(handlers.image).not.toHaveBeenCalled();
  });
});
