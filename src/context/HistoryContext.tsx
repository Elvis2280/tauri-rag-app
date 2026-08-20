import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FILE_STATUS } from "@/types/FileTypes";
import type { HistoryEntry } from "@/types/FileTypes";

type State = {
  entries: HistoryEntry[];
};

type Actions = {
  registerFileId: (id: string) => void;
  updateEntry: (id: string, patch: Partial<HistoryEntry>) => void;
  markFailed: (id: string, reason: string) => void;
  removeEntry: (id: string) => void;
};

export const useHistory = create<State & Actions>()(
  persist(
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
                    message: null,
                    status: FILE_STATUS.FILE_UPLOADED,
                    timestamp: new Date().toISOString(),
                    step: null,
                    stage: null,
                    pageNumber: null,
                    totalPages: null,
                    currentStep: null,
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
      removeEntry: (id) =>
        set((s) => ({
          entries: s.entries.filter((e) => e.file_id !== id),
        })),
    }),
    { name: "rag-history" },
  ),
);
