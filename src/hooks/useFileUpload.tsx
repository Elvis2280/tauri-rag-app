import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import apiRag from "@/lib/axios";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { workspaceKeys } from "@/hooks/useWorkspace";
import { historyKeys } from "@/hooks/useHistoryList";
import { useHistory } from "@/context/HistoryContext";
import { restartDocumentWatch } from "@/hooks/useHistoryWebsocket";
import type { FileUploadType } from "@/types/FileTypes";
import type { UploadFileSuccessResponse } from "@/types/UploadFileType";

export type UploadFileOutcome =
  | { fileId: string; response: UploadFileSuccessResponse }
  | { fileId: string; error: string };

type UploadFilesParams = {
  files: FileUploadType[];
  workspaceId: string;
  workspaceName: string;
  replacements: Record<string, string>;
};

type UseFileUploadResult = {
  uploadFiles: (params: UploadFilesParams) => Promise<UploadFileOutcome[]>;
  loading: boolean;
};

export default function useFileUpload(): UseFileUploadResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<UploadFileOutcome[], Error, UploadFilesParams>({
    mutationFn: async ({ files, workspaceId, replacements }) =>
      Promise.all(files.map(async ({ id: fileId, file }) => {
        const documentId = replacements[fileId];
        const formData = new FormData();
        formData.append("file", file);
        if (!documentId) formData.append("workspace_id", workspaceId);

        const request = documentId
          ? apiRag.patch<UploadFileSuccessResponse>(
              DOCUMENT_ENDPOINTS.replace(documentId),
              formData,
            )
          : apiRag.post<UploadFileSuccessResponse>(
              DOCUMENT_ENDPOINTS.upload,
              formData,
            );

        try {
          const { data } = await toast.promise(request, {
            loading: (
              <span className="flex items-center gap-2">
                <Loader2Icon className="size-4 animate-spin" />
                {documentId ? "Replacing" : "Uploading"} {file.name}…
              </span>
            ),
            success: (
              <span className="text-success">
                {file.name} {documentId ? "replaced" : "uploaded"}<br />check history page!
              </span>
            ),
            error: (error: unknown) => (
              <span className="text-destructive-foreground bg-destructive px-2 py-1 rounded">
                {file.name} failed: {extractApiErrorMessage(error, "Upload failed")}
              </span>
            ),
          }).unwrap();
          return { fileId, response: data };
        } catch (error) {
          return {
            fileId,
            error: extractApiErrorMessage(error, "Upload failed"),
          };
        }
      })),
    onSuccess: (outcomes, { workspaceName, replacements }) => {
      const successes = outcomes.filter(
        (outcome): outcome is Extract<UploadFileOutcome, { response: UploadFileSuccessResponse }> =>
          "response" in outcome,
      );
      if (successes.length === 0) return;

      void queryClient.invalidateQueries({ queryKey: workspaceKeys.tree() });
      void queryClient.invalidateQueries({ queryKey: historyKeys.lists() });
      successes.forEach(({ fileId, response }) => {
        if (replacements[fileId]) restartDocumentWatch(response.document_id);
        useHistory.getState().startReplacement(response, workspaceName);
        void queryClient.invalidateQueries({
          queryKey: ["documents", response.document_id, "history"],
        });
      });
    },
  });

  const uploadFiles = useCallback(
    (params: UploadFilesParams) => mutation.mutateAsync(params),
    [mutation.mutateAsync],
  );

  return { uploadFiles, loading: mutation.isLoading };
}
