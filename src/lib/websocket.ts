import { watchDocument } from '@/lib/axios';

enum State {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSED = 'closed',
  ERROR = 'error',
}

type MessageHandler = (message: unknown) => void;
type StateHandler = (state: string) => void;

export const WS_URL = '';

export type WebSocketClient = {
  connect(): void;
  disconnect(): void;
  subscribe(handler: MessageHandler): () => void;
  send(payload: unknown): void;
  getState(): string;
  onStateChange(handler: StateHandler): () => void;
};

type WebSocketClientOptions = { reconnect?: boolean };

function documentIdFromUrl(url: string): string {
  const marker = '/documents/';
  const start = url.lastIndexOf(marker);
  const suffix = start >= 0 ? url.slice(start + marker.length) : '';
  return suffix.endsWith('/ws') ? suffix.slice(0, -3) : '';
}

function createWebSocketClient(
  url: string,
  _options?: WebSocketClientOptions,
): WebSocketClient {
  let state: string = State.IDLE;
  let nativeClient: { disconnect: () => void } | null = null;
  const messageHandlers = new Set<MessageHandler>();
  const stateHandlers = new Set<StateHandler>();
  const fileId = documentIdFromUrl(url);

  function setState(nextState: string) {
    state = nextState;
    for (const handler of stateHandlers) handler(state);
  }

  function connect() {
    if (!fileId || state === State.OPEN || state === State.CONNECTING) {
      if (!fileId) setState(State.ERROR);
      return;
    }

    setState(State.CONNECTING);
    nativeClient = watchDocument(
      fileId,
      (payload) => {
        setState(State.OPEN);
        for (const handler of messageHandlers) handler(payload);
      },
      () => setState(State.ERROR),
    );
    setState(State.OPEN);
  }

  function disconnect() {
    nativeClient?.disconnect();
    nativeClient = null;
    setState(State.CLOSED);
  }

  function subscribe(handler: MessageHandler): () => void {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  }

  function send(_payload: unknown): void {
    throw new Error('Document status WebSockets are receive-only');
  }

  return {
    connect,
    disconnect,
    subscribe,
    send,
    getState: () => state,
    onStateChange: (handler) => {
      stateHandlers.add(handler);
      return () => stateHandlers.delete(handler);
    },
  };
}

let client: WebSocketClient | null = null;

export function getWebSocket(): WebSocketClient {
  if (!client) client = createWebSocketClient(WS_URL, { reconnect: true });
  return client;
}

export { createWebSocketClient };
