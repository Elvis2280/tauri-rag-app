import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createWebSocketClient, type WebSocketClient } from "@/lib/websocket";
import { useHistory } from "@/context/HistoryContext";
import { FILE_STATUS, type WebSocketProgressMessage } from "@/types/FileTypes";
import { historyKeys } from "@/hooks/useHistoryList";
import { workspaceKeys } from "@/hooks/useWorkspace";

const WS_BASE = "native://document-status";
const clients = new Map<string, WebSocketClient>();

export function restartDocumentWatch(documentId: string): void {
  const client = clients.get(documentId);
  if (!client) return;
  clients.delete(documentId);
  client.disconnect();
}

export function useHistoryWebsocket(enabled = true): void {
  const queryClient = useQueryClient();
  const entries = useHistory((state) => state.entries);

  useEffect(() => {
    if (!enabled) {
      for (const [id, client] of clients) {
        clients.delete(id);
        client.disconnect();
      }
      return;
    }

    const trackedDocumentIds = new Set(entries.map((entry) => entry.file_id));
    for (const [id, client] of clients) {
      if (trackedDocumentIds.has(id)) continue;
      clients.delete(id);
      client.disconnect();
    }

    for (const entry of entries) {
      if (clients.has(entry.file_id)) continue;
      if (
        entry.status === FILE_STATUS.COMPLETED ||
        entry.status === FILE_STATUS.FAILED ||
        entry.status === FILE_STATUS.CANCELLED
      ) continue;

      const client = createWebSocketClient(
        `${WS_BASE}/documents/${entry.file_id}/ws`,
        { reconnect: false },
      );
      clients.set(entry.file_id, client);

      client.subscribe((raw) => {
        if (clients.get(entry.file_id) !== client) return;
        const msg = raw as Partial<WebSocketProgressMessage>;
        if (!msg || typeof msg !== "object" || !msg.status) return;
        const messageDocumentId = msg.file_id ?? msg.document_id;
        if (messageDocumentId && messageDocumentId !== entry.file_id) {
          console.warn(
            "useHistoryWebsocket: message file_id doesn't match entry file_id",
            messageDocumentId,
            entry.file_id,
          );
          return;
        }

        if (msg.status === FILE_STATUS.CANCELLED) {
          useHistory.getState().completeCancellation(entry.file_id);
          void queryClient.resetQueries({ queryKey: historyKeys.lists() });
          void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
          clients.delete(entry.file_id);
          client.disconnect();
          return;
        }

        const current = useHistory
          .getState()
          .entries.find((item) => item.file_id === entry.file_id);
        useHistory.getState().updateEntry(entry.file_id, {
          status: msg.status,
          originalFilename: msg.original_filename ?? current?.originalFilename ?? null,
          workspaceName: msg.workspace_name ?? current?.workspaceName ?? null,
          message: msg.message ?? null,
          timestamp: msg.timestamp ?? current?.timestamp ?? new Date().toISOString(),
          step: msg.step ?? current?.step ?? null,
          stage: msg.stage ?? null,
          pageNumber: msg.page_number ?? null,
          totalPages: msg.total_pages ?? null,
          stepTotal: msg.step_total ?? msg.stepTotal ?? current?.stepTotal ?? null,
          error: msg.error ?? null,
        });

        if (
          msg.status === FILE_STATUS.COMPLETED ||
          msg.status === FILE_STATUS.FAILED
        ) {
          void queryClient.invalidateQueries({ queryKey: historyKeys.lists() });
          clients.delete(entry.file_id);
          client.disconnect();
        }
      });

      client.onStateChange((state) => {
        if (clients.get(entry.file_id) !== client) return;
        if (state !== "error" && state !== "closed") return;

        const current = useHistory
          .getState()
          .entries.find((item) => item.file_id === entry.file_id);
        if (
          current &&
          (current.status === FILE_STATUS.COMPLETED ||
            current.status === FILE_STATUS.FAILED ||
            current.status === FILE_STATUS.CANCELLED)
        ) {
          clients.delete(entry.file_id);
          client.disconnect();
          return;
        }

        if (
          current?.status === FILE_STATUS.CANCELLING ||
          useHistory.getState().cancellations[entry.file_id]?.phase === "pending"
        ) {
          clients.delete(entry.file_id);
          client.disconnect();
          return;
        }

        if (useHistory.getState().cancellations[entry.file_id]?.phase === "removed") {
          clients.delete(entry.file_id);
          client.disconnect();
          return;
        }

        clients.delete(entry.file_id);
        console.error("useHistoryWebsocket: connection error", {
          file_id: entry.file_id,
          state,
          url: `${WS_BASE}/documents/${entry.file_id}/ws`,
        });
        toast.error("Unable to get file's status");
        useHistory
          .getState()
          .markFailed(entry.file_id, "WebSocket disconnected before completion");
        void queryClient.invalidateQueries({ queryKey: historyKeys.lists() });
        client.disconnect();
      });

      client.connect();
    }
  }, [enabled, entries, queryClient]);

  useEffect(() => () => {
    for (const [id, client] of clients) {
      clients.delete(id);
      client.disconnect();
    }
  }, []);
}
