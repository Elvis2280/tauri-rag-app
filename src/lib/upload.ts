import type { FileUploadType } from "@/types/FileTypes";
import type { Workspace, WorkspaceFileNode, WorkspaceNode } from "@/types/WorkspaceTypes";

export type DuplicateUploadMatch = {
  fileId: string;
  fileName: string;
  candidates: Array<Pick<WorkspaceFileNode, "id" | "name">>;
};

function removeFileExtension(fileName: string): string {
  const finalDotIndex = fileName.lastIndexOf(".");
  return finalDotIndex <= 0 ? fileName : fileName.slice(0, finalDotIndex);
}

function getOriginalFiles(node: WorkspaceNode): WorkspaceFileNode[] {
  if (node.type === "file") return node.role === "original" ? [node] : [];
  return node.children.flatMap(getOriginalFiles);
}

export function findDuplicateUploadMatches(
  files: FileUploadType[],
  workspace: Workspace | undefined,
): DuplicateUploadMatch[] {
  if (!workspace) return [];

  const existingFiles = workspace.children.flatMap(getOriginalFiles);
  return files.flatMap(({ id, file }) => {
    const stem = removeFileExtension(file.name);
    const candidates = existingFiles
      .filter((existing) => removeFileExtension(existing.name) === stem)
      .map(({ id: documentId, name }) => ({ id: documentId, name }));
    return candidates.length > 0
      ? [{ fileId: id, fileName: file.name, candidates }]
      : [];
  });
}

export function findDuplicateUploadFiles(
  files: FileUploadType[],
  workspace: Workspace | undefined,
): FileUploadType[] {
  const matchedFileIds = new Set(
    findDuplicateUploadMatches(files, workspace).map(({ fileId }) => fileId),
  );
  return files.filter(({ id }) => matchedFileIds.has(id));
}
