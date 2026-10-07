import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import {
  IMAGE_EXTENSION_BY_MIME_TYPE,
  IMAGE_FILE_FILTER_NAME,
  IMAGE_MESSAGES,
} from "@/constants/image";
import apiRag, { normalizeNativeError } from "@/lib/axios";
import { DOCUMENT_ENDPOINTS } from "@/lib/api/endpoints";

export type SaveImageInput = {
  name: string;
  mimeType: string;
  data: Uint8Array;
};

type UseDocumentImageResult = {
  loadImage: (fileId: string) => Promise<Uint8Array>;
  saveImage: (input: SaveImageInput) => Promise<boolean>;
  isPending: boolean;
  isSaving: boolean;
  error: string | null;
};

async function fetchDocumentImage(fileId: string): Promise<Uint8Array> {
  const response = await apiRag.getBinary(DOCUMENT_ENDPOINTS.image(fileId));
  return response.data;
}

function getImageExtension(name: string, mimeType: string): string {
  const extension = name.trim().match(/\.([^.\\/]+)$/)?.[1];
  return (
    extension?.toLocaleLowerCase() ??
    IMAGE_EXTENSION_BY_MIME_TYPE[mimeType.toLocaleLowerCase()] ??
    "img"
  );
}

function getSuggestedImageFilename(name: string, mimeType: string): string {
  const sanitizedName = name.trim().replace(/[\\/\u0000]/g, "_");
  const extension = getImageExtension(name, mimeType);
  const filename = sanitizedName || `image.${extension}`;
  return /\.[^.]+$/.test(filename) ? filename : `${filename}.${extension}`;
}

async function saveDocumentImage({
  name,
  mimeType,
  data,
}: SaveImageInput): Promise<boolean> {
  const extension = getImageExtension(name, mimeType);
  const path = await save({
    defaultPath: getSuggestedImageFilename(name, mimeType),
    filters: [
      {
        name: IMAGE_FILE_FILTER_NAME,
        extensions: [extension],
      },
    ],
  });

  if (!path) {
    return false;
  }

  await writeFile(path, data);
  return true;
}

export function useDocumentImage(): UseDocumentImageResult {
  const loadMutation = useMutation<Uint8Array, Error, string>({
    mutationFn: fetchDocumentImage,
    onError: (error) => {
      toast.error(IMAGE_MESSAGES.loadError, {
        description: normalizeNativeError(error, IMAGE_MESSAGES.loadError)
          .message,
      });
    },
  });
  const saveMutation = useMutation<boolean, Error, SaveImageInput>({
    mutationFn: saveDocumentImage,
    onSuccess: (saved) => {
      if (saved) {
        toast.success(IMAGE_MESSAGES.saveSuccess);
      }
    },
    onError: (error) => {
      toast.error(IMAGE_MESSAGES.saveError, {
        description: normalizeNativeError(error, IMAGE_MESSAGES.saveError)
          .message,
      });
    },
  });

  const loadImage = useCallback(
    (fileId: string) => loadMutation.mutateAsync(fileId),
    [loadMutation.mutateAsync],
  );
  const saveImage = useCallback(
    (input: SaveImageInput) => saveMutation.mutateAsync(input),
    [saveMutation.mutateAsync],
  );

  return {
    loadImage,
    saveImage,
    isPending: loadMutation.isLoading,
    isSaving: saveMutation.isLoading,
    error: loadMutation.error
      ? normalizeNativeError(loadMutation.error, IMAGE_MESSAGES.loadError)
          .message
      : null,
  };
}
