import { create } from "zustand";
import { FILE_STATUS } from "@/types/FileTypes";
import type { HistoryEntry } from "@/types/FileTypes";

type State = {
  entries: HistoryEntry[];
};

type Actions = {
  registerFileId: (id: string) => void;
  updateEntry: (id: string, patch: Partial<HistoryEntry>) => void;
  markFailed: (id: string, reason: string) => void;
  markRetryQueued: (id: string) => void;
  removeEntry: (id: string) => void;
};

export const useHistory = create<State & Actions>()(
    (set) => ({
      entries: [],
      registerFileId: (id) =>
        set((s) =>
          s.entries.some((e) => e.file_id === id)
            ? s
            : {
                entries: [
                  ...s.entries,
                  {
                    file_id: id,
                    originalFilename: null,
                    workspaceName: null,
                    message: null,
                    status: FILE_STATUS.FILE_UPLOADED,
                    timestamp: new Date().toISOString(),
                    step: null,
                    stage: null,
                    pageNumber: null,
                    totalPages: null,
                    stepTotal: null,
                    error: null,
                  },
                ],
              },
        ),
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
