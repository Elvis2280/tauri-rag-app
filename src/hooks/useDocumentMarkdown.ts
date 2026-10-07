import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MARKDOWN_MESSAGES } from "@/constants/markdown";
import apiRag, { normalizeNativeError } from "@/lib/axios";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";

type UseDocumentMarkdownResult = {
  loadMarkdown: (fileId: string) => Promise<string>;
  isPending: boolean;
  error: string | null;
};

async function fetchDocumentMarkdown(fileId: string): Promise<string> {
  const response = await apiRag.getBinary(DOCUMENT_ENDPOINTS.markdown(fileId));
  return new TextDecoder("utf-8", { fatal: true }).decode(response.data);
}

export function useDocumentMarkdown(): UseDocumentMarkdownResult {
  const mutation = useMutation<string, Error, string>({
    mutationFn: fetchDocumentMarkdown,
    onError: (error) => {
      toast.error(MARKDOWN_MESSAGES.loadError, {
        description: normalizeNativeError(
          error,
          MARKDOWN_MESSAGES.loadError,
        ).message,
      });
    },
  });

  const loadMarkdown = useCallback(
    (fileId: string) => mutation.mutateAsync(fileId),
    [mutation.mutateAsync],
  );

  return {
    loadMarkdown,
    isPending: mutation.isLoading,
    error: mutation.error
      ? normalizeNativeError(mutation.error, MARKDOWN_MESSAGES.loadError)
          .message
      : null,
  };
}
