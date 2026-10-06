import type { FileUploadType } from "@/types/FileTypes";
import type { Workspace, WorkspaceNode } from "@/types/WorkspaceTypes";

function removeFileExtension(fileName: string): string {
  const finalDotIndex = fileName.lastIndexOf(".");

  if (finalDotIndex <= 0) {
    return fileName;
  }

  return fileName.slice(0, finalDotIndex);
}

function getWorkspaceFileNames(node: WorkspaceNode): string[] {
  if (node.type === "file") {
    return [node.originalName ?? node.name];
  }

  return node.children.flatMap(getWorkspaceFileNames);
}

export function findDuplicateUploadFiles(
  files: FileUploadType[],
  workspace: Workspace | undefined,
): FileUploadType[] {
  if (!workspace) {
    return [];
  }

  const existingNames = new Set(
    workspace.children
      .flatMap(getWorkspaceFileNames)
      .map(removeFileExtension),
  );

  return files.filter(({ file }) =>
    existingNames.has(removeFileExtension(file.name)),
  );
}
