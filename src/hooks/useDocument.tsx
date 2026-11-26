import { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import {
  DOCUMENT_MESSAGES,
  PDF_FILE_EXTENSION,
  PDF_FILE_FILTER_NAME,
} from '@/constants/document';
import {
  HISTORY_CANCELLATION_MESSAGES,
  HISTORY_RETRY_MESSAGES,
} from '@/constants/history';
import apiRag, { ApiError, normalizeNativeError } from '@/lib/axios';
import { DOCUMENT_ENDPOINTS } from '@/lib/api/endpoints';
import { extractApiErrorMessage } from '@/lib/api/errors';
import { useHistory } from '@/context/HistoryContext';
import { historyKeys } from '@/hooks/useHistoryList';
import { workspaceKeys } from '@/hooks/useWorkspace';
import { FILE_STATUS } from '@/types/FileTypes';

type UseDocumentPdfResult = {
  loadPdf: (documentId: string) => Promise<Uint8Array>;
  savePdf: (input: SavePdfInput) => Promise<boolean>;
  isPending: boolean;
  isSaving: boolean;
  error: string | null;
};

export type SavePdfInput = {
  name: string;
  data: Uint8Array;
};

type RetryDocumentResponse = { document_id: string; task_id: string };

async function retryDocument(documentId: string): Promise<RetryDocumentResponse> {
  const response = await apiRag.post<RetryDocumentResponse>(DOCUMENT_ENDPOINTS.retry(documentId));
  return response.data;
}

export function useRetryDocument() {
  const queryClient = useQueryClient();
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const retry = useCallback(async (documentId: string) => {
    setPendingDocumentId(documentId);
    try {
      await retryDocument(documentId);
      useHistory.getState().markRetryQueued(documentId);
      await queryClient.invalidateQueries({ queryKey: historyKeys.lists() });
    } catch (error) {
      const title = HISTORY_RETRY_MESSAGES.error;
      toast.error(title, {
        description: extractApiErrorMessage(error, normalizeNativeError(error, title).message),
        position: 'bottom-center',
        richColors: false,
      });
    } finally {
      setPendingDocumentId(null);
    }
  }, [queryClient]);
  return { retryDocument: retry, isPending: pendingDocumentId !== null, pendingDocumentId };
}

type CancelDocumentResponse = {
  document_id: string;
  task_id: string;
  status: 'cancelling';
  message: string;
};

type DocumentStatusResponse = {
  document_id: string;
  status: string;
  document_record_status: string;
  error: string | null;
  message: string;
};

function waitForNextCancellationCheck(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, HISTORY_CANCELLATION_MESSAGES.pollingIntervalMs);
  });
}

function isCancellationPending(documentId: string, generation: number): boolean {
  const state = useHistory.getState();
  return state.cancellationGeneration === generation &&
    state.cancellations[documentId]?.phase === 'pending';
}

function refreshHistoryAfterCancellation(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.resetQueries({ queryKey: historyKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
}

async function monitorDocumentCancellation(
  documentId: string,
  generation: number,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  while (isCancellationPending(documentId, generation)) {
    try {
      const response = await apiRag.get<DocumentStatusResponse>(
        DOCUMENT_ENDPOINTS.status(documentId),
      );
      if (!isCancellationPending(documentId, generation)) return;

      const documentStatus = response.data.document_record_status;
      if (documentStatus === FILE_STATUS.CANCELLED) {
        useHistory.getState().completeCancellation(documentId);
        refreshHistoryAfterCancellation(queryClient);
        return;
      }

      if (documentStatus === FILE_STATUS.CANCELLING && response.data.error) {
        const message = response.data.error;
        useHistory.getState().failCancellation(documentId, message);
        toast.error(HISTORY_CANCELLATION_MESSAGES.cleanupError, {
          description: message,
          position: 'bottom-center',
          richColors: true,
        });
        void queryClient.invalidateQueries({ queryKey: historyKeys.lists() });
        return;
      }

      if (
        documentStatus === FILE_STATUS.FAILED ||
        documentStatus === FILE_STATUS.COMPLETED
      ) {
        const message = response.data.error || response.data.message;
        const status = documentStatus === FILE_STATUS.FAILED
          ? FILE_STATUS.FAILED
          : FILE_STATUS.COMPLETED;
        useHistory.getState().failCancellation(documentId, message, status);
        toast.error(HISTORY_CANCELLATION_MESSAGES.error, {
          description: message,
          position: 'bottom-center',
          richColors: true,
        });
        void queryClient.invalidateQueries({ queryKey: historyKeys.lists() });
        return;
      }
    } catch (error) {
      if (!isCancellationPending(documentId, generation)) return;

      if (error instanceof ApiError && error.response.status === 404) {
        useHistory.getState().completeCancellation(documentId);
        refreshHistoryAfterCancellation(queryClient);
        return;
      }

      if (
        error instanceof ApiError &&
        error.response.status >= 400 &&
        error.response.status < 500
      ) {
        const message = extractApiErrorMessage(
          error,
          normalizeNativeError(error, HISTORY_CANCELLATION_MESSAGES.error).message,
        );
        useHistory.getState().failCancellation(documentId, message);
        toast.error(HISTORY_CANCELLATION_MESSAGES.error, {
          description: message,
          position: 'bottom-center',
          richColors: true,
        });
        void queryClient.invalidateQueries({ queryKey: historyKeys.lists() });
        return;
      }
    }

    if (!isCancellationPending(documentId, generation)) return;
    await waitForNextCancellationCheck();
  }
}

export function useCancelDocument() {
  const queryClient = useQueryClient();
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const pendingDocumentIdRef = useRef<string | null>(null);

  const cancelDocument = useCallback(async (documentId: string): Promise<boolean> => {
    if (
      pendingDocumentIdRef.current !== null ||
      useHistory.getState().cancellations[documentId]?.phase === 'pending'
    ) return false;
    pendingDocumentIdRef.current = documentId;
    setPendingDocumentId(documentId);
    const generation = useHistory.getState().cancellationGeneration;

    try {
      const response = await apiRag.post<CancelDocumentResponse>(
        DOCUMENT_ENDPOINTS.cancel(documentId),
      );
      if (
        response.data.document_id !== documentId ||
        response.data.status !== FILE_STATUS.CANCELLING
      ) {
        throw new Error('The server returned an invalid cancellation response');
      }
      if (useHistory.getState().cancellationGeneration !== generation) return true;

      useHistory.getState().requestCancellation(documentId, response.data.message);
      toast.success(HISTORY_CANCELLATION_MESSAGES.pending, {
        description: response.data.message,
        position: 'bottom-right',
        richColors: false,
        className: 'border-success text-success',
      });
      void monitorDocumentCancellation(documentId, generation, queryClient);
      return true;
    } catch (error) {
      if (useHistory.getState().cancellationGeneration === generation) {
        toast.error(HISTORY_CANCELLATION_MESSAGES.error, {
          description: extractApiErrorMessage(
            error,
            normalizeNativeError(error, HISTORY_CANCELLATION_MESSAGES.error).message,
          ),
          position: 'bottom-center',
          richColors: true,
        });
      }
      return false;
    } finally {
      pendingDocumentIdRef.current = null;
      setPendingDocumentId(null);
    }
  }, [queryClient]);

  return {
    cancelDocument,
    isPending: pendingDocumentId !== null,
    pendingDocumentId,
  };
}

async function fetchDocumentPdf(documentId: string): Promise<Uint8Array> {
  const endpoint = DOCUMENT_ENDPOINTS.pdf(documentId);
  const response = await apiRag.getBinary(endpoint);
  return response.data;
}

function getSuggestedPdfFilename(name: string): string {
  const sanitizedName = name.trim().replace(/[\\/\u0000]/g, '_');
  const filename = sanitizedName || `document.${PDF_FILE_EXTENSION}`;
  return filename.toLowerCase().endsWith(`.${PDF_FILE_EXTENSION}`)
    ? filename
    : `${filename}.${PDF_FILE_EXTENSION}`;
}

async function saveDocumentPdf({ name, data }: SavePdfInput): Promise<boolean> {
  const path = await save({
    defaultPath: getSuggestedPdfFilename(name),
    filters: [
      {
        name: PDF_FILE_FILTER_NAME,
        extensions: [PDF_FILE_EXTENSION],
      },
    ],
  });

  if (!path) {
    return false;
  }

  await writeFile(path, data);
  return true;
}

export function useDocumentPdf(): UseDocumentPdfResult {
  const mutation = useMutation<Uint8Array, Error, string>({
    mutationFn: fetchDocumentPdf,
    onError: (error) => {
      toast.error(DOCUMENT_MESSAGES.downloadError, {
        description: normalizeNativeError(
          error,
          DOCUMENT_MESSAGES.downloadError,
        ).message,
      });
    },
  });
  const saveMutation = useMutation<boolean, Error, SavePdfInput>({
    mutationFn: saveDocumentPdf,
    onSuccess: (saved) => {
      if (saved) {
        toast.success(DOCUMENT_MESSAGES.saveSuccess);
      }
    },
    onError: (error) => {
      toast.error(DOCUMENT_MESSAGES.saveError, {
        description: normalizeNativeError(error, DOCUMENT_MESSAGES.saveError)
          .message,
      });
    },
  });

  const loadPdf = useCallback(
    (documentId: string) => mutation.mutateAsync(documentId),
    [mutation.mutateAsync],
  );
  const savePdf = useCallback(
    (input: SavePdfInput) => saveMutation.mutateAsync(input),
    [saveMutation.mutateAsync],
  );

  return {
    loadPdf,
    savePdf,
    isPending: mutation.isLoading,
    isSaving: saveMutation.isLoading,
    error: mutation.error
      ? normalizeNativeError(mutation.error, DOCUMENT_MESSAGES.downloadError)
          .message
      : null,
  };
}
