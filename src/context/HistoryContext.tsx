import { create } from "zustand";
import { FILE_STATUS } from "@/types/FileTypes";
import type { HistoryEntry } from "@/types/FileTypes";
import type { UploadFileSuccessResponse } from "@/types/UploadFileType";

type State = {
  entries: HistoryEntry[];
  cancellations: Record<string, DocumentCancellationState>;
  cancellationGeneration: number;
};

export type DocumentCancellationState = {
  phase: "pending" | "failed" | "removed";
  message: string | null;
};

type ServerEntrySnapshot = {
  entry: HistoryEntry;
  fetchedAt: number;
};

type Actions = {
  startReplacement: (response: UploadFileSuccessResponse, workspaceName: string) => void;
  updateEntry: (id: string, patch: Partial<HistoryEntry>) => void;
  syncServerEntries: (entries: ServerEntrySnapshot[]) => void;
  markFailed: (id: string, reason: string) => void;
  markRetryQueued: (id: string) => void;
  removeEntry: (id: string) => void;
  requestCancellation: (id: string, message: string) => void;
  failCancellation: (id: string, message: string, status?: HistoryEntry["status"]) => void;
  completeCancellation: (id: string) => void;
  clearEntries: () => void;
};

export const useHistory = create<State & Actions>()(
    (set) => ({
      entries: [],
      cancellations: {},
      cancellationGeneration: 0,
      startReplacement: (response, workspaceName) =>
        set((s) => {
          const entry: HistoryEntry = {
            file_id: response.document_id,
            workspaceId: response.workspace_id,
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
          const cancellations = { ...s.cancellations };
          delete cancellations[response.document_id];
          if (existingIndex === -1) return { entries: [...s.entries, entry], cancellations };
          const entries = s.entries.slice();
          entries[existingIndex] = entry;
          return { entries, cancellations };
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
      syncServerEntries: (serverEntries) =>
        set((state) => {
          const next = state.entries.slice();
          let changed = false;

          for (const snapshot of serverEntries) {
            const { entry: serverEntry, fetchedAt } = snapshot;
            if (state.cancellations[serverEntry.file_id]) continue;
            const index = next.findIndex(
              (entry) => entry.file_id === serverEntry.file_id,
            );
            if (index === -1) {
              next.push(serverEntry);
              changed = true;
              continue;
            }

            const current = next[index];
            const currentTimestamp = Date.parse(current.timestamp);
            if (Number.isFinite(currentTimestamp) && currentTimestamp > fetchedAt) {
              continue;
            }

            const keys = Object.keys(serverEntry) as (keyof HistoryEntry)[];
            const isEqual = keys.every((key) => current[key] === serverEntry[key]);
            if (isEqual) continue;

            next[index] = serverEntry;
            changed = true;
          }

          return changed ? { entries: next } : state;
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
        set((s) => ({ cancellations: Object.fromEntries(Object.entries(s.cancellations).filter(([documentId]) => documentId !== id)), entries: s.entries.map((entry) => entry.file_id === id
          ? { ...entry, status: FILE_STATUS.RETRY_QUEUED, message: "Retry queued", error: null, step: null, stage: null, pageNumber: null, timestamp: new Date().toISOString() }
          : entry) })),
      removeEntry: (id) =>
        set((s) => ({
          entries: s.entries.filter((e) => e.file_id !== id),
        })),
      requestCancellation: (id, message) =>
        set((state) => ({
          cancellations: {
            ...state.cancellations,
            [id]: { phase: "pending", message },
          },
          entries: state.entries.map((entry) => entry.file_id === id
            ? { ...entry, status: FILE_STATUS.CANCELLING, message, error: null, timestamp: new Date().toISOString() }
            : entry),
        })),
      failCancellation: (id, message, status) =>
        set((state) => ({
          cancellations: {
            ...state.cancellations,
            [id]: { phase: "failed", message },
          },
          entries: state.entries.map((entry) => entry.file_id === id
            ? { ...entry, status: status ?? entry.status, message, error: message, timestamp: new Date().toISOString() }
            : entry),
        })),
      completeCancellation: (id) =>
        set((state) => ({
          cancellations: {
            ...state.cancellations,
            [id]: { phase: "removed", message: null },
          },
          entries: state.entries.filter((entry) => entry.file_id !== id),
        })),
      clearEntries: () => set((state) => ({
        entries: [],
        cancellations: {},
        cancellationGeneration: state.cancellationGeneration + 1,
      })),
    }),
);
