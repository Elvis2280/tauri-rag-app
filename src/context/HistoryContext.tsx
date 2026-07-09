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
  removeEntry: (id: string) => void;
};

export const useHistory = create<State & Actions>()((set) => ({
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
                message: "",
                status: FILE_STATUS.FILE_UPLOADED,
                timestamp: new Date().toISOString(),
              },
            ],
          },
    ),
  updateEntry: (id, patch) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.file_id === id ? { ...e, ...patch } : e,
      ),
    })),
  markFailed: (id, reason) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.file_id === id
          ? {
              ...e,
              status: FILE_STATUS.FAILED,
              message: reason,
              timestamp: new Date().toISOString(),
            }
          : e,
      ),
    })),
  removeEntry: (id) =>
    set((s) => ({
      entries: s.entries.filter((e) => e.file_id !== id),
    })),
}));
