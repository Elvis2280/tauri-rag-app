import { useEffect } from "react";
import { createWebSocketClient, type WebSocketClient } from "@/lib/websocket";
import { useHistory } from "@/context/HistoryContext";
import { FILE_STATUS, type WebSocketProgressMessage } from "@/types/FileTypes";

const WS_BASE = "ws://localhost:8080/api/v1";

const clients = new Map<string, WebSocketClient>();

export function useHistoryWebsocket(): void {
  const entries = useHistory((s) => s.entries);

  useEffect(() => {
    for (const entry of entries) {
      if (clients.has(entry.file_id)) continue;

      const client = createWebSocketClient(
        `${WS_BASE}/documents/${entry.file_id}/ws`,
        { reconnect: false },
      );

      client.subscribe((raw) => {
        const msg = raw as Partial<WebSocketProgressMessage>;
        if (!msg || typeof msg !== "object" || !msg.status) return;

        useHistory.getState().updateEntry(entry.file_id, {
          status: msg.status,
          message: msg.message ?? "",
          timestamp: msg.timestamp ?? entry.timestamp,
        });

        if (
          msg.status === FILE_STATUS.COMPLETED ||
          msg.status === FILE_STATUS.FAILED
        ) {
          client.disconnect();
          clients.delete(entry.file_id);
        }
      });

      client.onStateChange((state) => {
        if (
          (state === "error" || state === "closed") &&
          clients.has(entry.file_id)
        ) {
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
}
