import { useEffect } from "react";
import { toast } from "sonner";
import { createWebSocketClient, type WebSocketClient } from "@/lib/websocket";
import { useHistory } from "@/context/HistoryContext";
import { FILE_STATUS, type WebSocketProgressMessage } from "@/types/FileTypes";

const WS_BASE = "ws://localhost:8080/api/v1";

const clients = new Map<string, WebSocketClient>();
const intentionallyClosed = new Set<string>();

export function useHistoryWebsocket(): void {
  const entries = useHistory((s) => s.entries);

  useEffect(() => {
    for (const entry of entries) {
      if (clients.has(entry.file_id)) continue;
      if (
        entry.status === FILE_STATUS.COMPLETED ||
        entry.status === FILE_STATUS.FAILED
      ) continue;

      const client = createWebSocketClient(
        `${WS_BASE}/documents/${entry.file_id}/ws`,
        { reconnect: false },
      );

      client.subscribe((raw) => {
        const msg = raw as Partial<WebSocketProgressMessage>;
        if (!msg || typeof msg !== "object" || !msg.status) return;
        if (msg.file_id && msg.file_id !== entry.file_id) {
          console.warn(
            "useHistoryWebsocket: message file_id doesn't match entry file_id",
            msg.file_id,
            entry.file_id,
          );
          return;
        }

        const current = useHistory
          .getState()
          .entries.find((e) => e.file_id === entry.file_id);

        useHistory.getState().updateEntry(entry.file_id, {
          status: msg.status,
          message: msg.message ?? null,
          timestamp: msg.timestamp ?? current?.timestamp ?? new Date().toISOString(),
          step: msg.step ?? null,
          stage: msg.stage ?? null,
          pageNumber: msg.page_number ?? null,
          totalPages: msg.total_pages ?? null,
          currentStep: msg.current_step ?? null,
          stepTotal: msg.stepTotal ?? null,
          error: msg.error ?? null,
        });

        if (
          msg.status === FILE_STATUS.COMPLETED ||
          msg.status === FILE_STATUS.FAILED
        ) {
          intentionallyClosed.add(entry.file_id);
          client.disconnect();
          clients.delete(entry.file_id);
        }
      });

      client.onStateChange((state) => {
        if (intentionallyClosed.has(entry.file_id)) return;
        if (state === "error" || state === "closed") {
          intentionallyClosed.add(entry.file_id);
          const current = useHistory
            .getState()
            .entries.find((e) => e.file_id === entry.file_id);
          if (
            current &&
            (current.status === FILE_STATUS.COMPLETED ||
              current.status === FILE_STATUS.FAILED)
          ) {
            client.disconnect();
            clients.delete(entry.file_id);
            return;
          }
          console.error(
            "useHistoryWebsocket: connection error",
            {
              file_id: entry.file_id,
              state,
              url: `${WS_BASE}/documents/${entry.file_id}/ws`,
            },
          );
          toast.error("Unable to get file's status");
          useHistory
            .getState()
            .markFailed(
              entry.file_id,
              "WebSocket disconnected before completion",
            );
          client.disconnect();
          clients.delete(entry.file_id);
        }
      });

      clients.set(entry.file_id, client);
      client.connect();
    }
  }, [entries]);

  useEffect(() => {
    return () => {
      for (const [id, client] of clients) {
        intentionallyClosed.add(id);
        client.disconnect();
      }
      clients.clear();
      intentionallyClosed.clear();
    };
  }, []);
}
