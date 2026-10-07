import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import {
  DOCUMENT_MESSAGES,
  PDF_FILE_EXTENSION,
  PDF_FILE_FILTER_NAME,
} from '@/constants/document';
import apiRag, { normalizeNativeError } from '@/lib/axios';
import { DOCUMENT_ENDPOINTS } from '@/lib/api/endpoints';

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
