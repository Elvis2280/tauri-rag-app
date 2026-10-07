import { IMAGE_MIME_TYPE_BY_EXTENSION } from "@/constants/image";
import { IMAGE_FILE_EXTENSION_PATTERN } from "@/constants/workspace";
import type { WorkspaceFileNode } from "@/types/WorkspaceTypes";

export type WorkspaceFileOpenAction = "pdf" | "markdown" | "image";

export type WorkspaceFileOpenHandlers = Record<
  WorkspaceFileOpenAction,
  (file: WorkspaceFileNode) => void
>;

export function getWorkspaceFileOpenAction(
  file: WorkspaceFileNode,
): WorkspaceFileOpenAction | null {
  const fileName = file.name.trim();
  if (file.mimeType?.trim().toLocaleLowerCase().startsWith("image/")) {
    return "image";
  }
  if (/\.pdf$/i.test(fileName)) {
    return "pdf";
  }
  if (/\.(?:md|markdown)$/i.test(fileName)) {
    return "markdown";
  }
  if (IMAGE_FILE_EXTENSION_PATTERN.test(fileName)) {
    return "image";
  }

  return null;
}

export function getWorkspaceFileImageMimeType(file: WorkspaceFileNode): string {
  const declaredMimeType = file.mimeType?.trim().toLocaleLowerCase();
  if (declaredMimeType?.startsWith("image/")) {
    return declaredMimeType;
  }

  const extension = file.name.trim().split(".").pop()?.toLocaleLowerCase();
  return extension
    ? (IMAGE_MIME_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream")
    : "application/octet-stream";
}

export function dispatchWorkspaceFileOpen(
  file: WorkspaceFileNode,
  handlers: WorkspaceFileOpenHandlers,
): WorkspaceFileOpenAction | null {
  const action = getWorkspaceFileOpenAction(file);
  if (!action) {
    return null;
  }

  handlers[action](file);
  return action;
}
