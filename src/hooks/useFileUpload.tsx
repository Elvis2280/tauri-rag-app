import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import apiRag from "@/lib/axios";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { workspaceTreeQueryKey } from "@/hooks/useWorkspaceTree";
import { useHistory } from "@/context/HistoryContext";
import type { UploadFileSuccessResponse } from "@/types/UploadFileType";

type UploadFilesParams = {
  files: File[];
  workspaceId: string;
};

type UseFileUploadResult = {
  uploadFiles: (params: UploadFilesParams) => Promise<UploadFileSuccessResponse[]>;
  loading: boolean;
};

export default function useFileUpload(): UseFileUploadResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    UploadFileSuccessResponse[],
    Error,
    UploadFilesParams
  >({
    mutationFn: async ({ files, workspaceId }) => {
      const tasks = files.map((file) => {
        const formData = new FormData();
        formData.append("workspace_id", workspaceId);
        formData.append("file", file);

        const request = apiRag.post<UploadFileSuccessResponse>(
          DOCUMENT_ENDPOINTS.upload,
          formData,
        );

        return toast
          .promise(request, {
            loading: (
              <span className="flex items-center gap-2">
                <Loader2Icon className="size-4 animate-spin" />
                Uploading {file.name}…
              </span>
            ),
            success: <span className="text-success">{file.name} uploaded</span>,
            error: (err: unknown) => (
              <span className="text-destructive-foreground bg-destructive px-2 py-1 rounded">
                {file.name} failed:{" "}
                {extractApiErrorMessage(err, "Upload failed")}
              </span>
            ),
          })
          .unwrap()
          .then(
            (response) => response.data,
            () => null,
          );
      });

      const results = await Promise.all(tasks);
      return results.filter((r): r is UploadFileSuccessResponse => r !== null);
    },
    onSuccess: (data: UploadFileSuccessResponse[]) => {
      queryClient.invalidateQueries({ queryKey: workspaceTreeQueryKey });
      data.forEach((result) => {
        useHistory.getState().registerFileId(result.document_id);
      });
    },
  });

  const uploadFiles = useCallback(
    async (params: UploadFilesParams): Promise<UploadFileSuccessResponse[]> => {
      return mutation.mutateAsync(params);
    },
    [mutation],
  );

  return { uploadFiles, loading: mutation.isLoading };
}
