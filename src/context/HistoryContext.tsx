import { create } from "zustand";
import { FILE_STATUS } from "@/types/FileTypes";
import type { HistoryEntry } from "@/types/FileTypes";
import type { UploadFileSuccessResponse } from "@/types/UploadFileType";

type State = {
  entries: HistoryEntry[];
};

type Actions = {
  startReplacement: (response: UploadFileSuccessResponse, workspaceName: string) => void;
  updateEntry: (id: string, patch: Partial<HistoryEntry>) => void;
  markFailed: (id: string, reason: string) => void;
  markRetryQueued: (id: string) => void;
  removeEntry: (id: string) => void;
};

export const useHistory = create<State & Actions>()(
    (set) => ({
      entries: [],
      startReplacement: (response, workspaceName) =>
        set((s) => {
          const entry: HistoryEntry = {
            file_id: response.document_id,
            originalFilename: response.original_filename,
            workspaceName,
            message: response.message,
            status: FILE_STATUS.FILE_UPLOADED,
            timestamp: new Date().toISOString(),
            step: null,
            stage: null,
            pageNumber: null,
            totalPages: response.page_count || null,
            stepTotal: null,
            error: null,
          };
          const existingIndex = s.entries.findIndex(
            (item) => item.file_id === response.document_id,
          );
          if (existingIndex === -1) return { entries: [...s.entries, entry] };
          const entries = s.entries.slice();
          entries[existingIndex] = entry;
          return { entries };
        }),
      updateEntry: (id, patch) =>
        set((s) => {
          const idx = s.entries.findIndex((e) => e.file_id === id);
          if (idx === -1) return s;
          const current = s.entries[idx];
          let changed = false;
          for (const key of Object.keys(patch) as (keyof HistoryEntry)[]) {
            if (current[key] !== patch[key]) {
              changed = true;
              break;
            }
          }
          if (!changed) return s;
          const next = s.entries.slice();
          next[idx] = { ...current, ...patch };
          return { entries: next };
        }),
      markFailed: (id, reason) =>
        set((s) => {
          const idx = s.entries.findIndex((e) => e.file_id === id);
          if (idx === -1) return s;
          const current = s.entries[idx];
          if (current.status === FILE_STATUS.FAILED) return s;
          const next = s.entries.slice();
          next[idx] = {
            ...current,
            status: FILE_STATUS.FAILED,
            message: reason,
            timestamp: new Date().toISOString(),
          };
          return { entries: next };
        }),
      markRetryQueued: (id) =>
        set((s) => ({ entries: s.entries.map((entry) => entry.file_id === id
          ? { ...entry, status: FILE_STATUS.RETRY_QUEUED, message: "Retry queued", error: null, step: null, stage: null, pageNumber: null, timestamp: new Date().toISOString() }
          : entry) })),
      removeEntry: (id) =>
        set((s) => ({
          entries: s.entries.filter((e) => e.file_id !== id),
        })),
    }),
);
