enum State {
  IDLE = "idle",
  CONNECTING = "connecting",
  OPEN = "open",
  CLOSED = "closed",
  ERROR = "error",
}

type MessageHandler = (message: unknown) => void;
type StateHandler = (state: string) => void;

export const WS_URL = "ws://localhost:8080/ws";

export type WebSocketClient = {
  connect(): void;
  disconnect(): void;
  subscribe(handler: MessageHandler): () => void;
  send(payload: unknown): void;
  getState(): string;
  onStateChange(handler: StateHandler): () => void;
};

type WebSocketClientOptions = {
  reconnect?: boolean;
};

function createWebSocketClient(
  url: string,
  options?: WebSocketClientOptions,
): WebSocketClient {
  const { reconnect: reconnectEnabled = true } = options ?? {};
  let socket: WebSocket | null = null;
  let state: string = State.IDLE;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 10_000;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disconnectRequested = false;

  const messageHandlers = new Set<MessageHandler>();
  const stateHandlers = new Set<StateHandler>();

  function setState(newState: string) {
    state = newState;
    for (const h of stateHandlers) h(state);
  }

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (!reconnectEnabled) return;
    if (disconnectRequested) return;
    if (reconnectAttempts >= maxReconnectAttempts) return;

    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectAttempts++;
      setState(State.CONNECTING);
      attachSocket(new WebSocket(url));
    }, reconnectDelay);
  }

  function attachSocket(ws: WebSocket) {
    socket = ws;

    ws.onopen = () => {
      reconnectAttempts = 0;
      setState(State.OPEN);
    };

    ws.onmessage = (event: MessageEvent) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data as string);
      } catch {
        parsed = event.data;
      }
      for (const h of messageHandlers) h(parsed);
    };

    ws.onerror = () => {
      setState(State.ERROR);
    };

    ws.onclose = () => {
      socket = null;
      setState(State.CLOSED);
      scheduleReconnect();
    };
  }

  function connect() {
    disconnectRequested = false;
    if (state === State.OPEN || state === State.CONNECTING) return;

    clearReconnectTimer();
    reconnectAttempts = 0;
    setState(State.CONNECTING);
    attachSocket(new WebSocket(url));
  }

  function disconnect() {
    disconnectRequested = true;
    clearReconnectTimer();
    reconnectAttempts = 0;

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
      socket = null;
    }

    setState(State.CLOSED);
  }

  function subscribe(handler: MessageHandler): () => void {
    messageHandlers.add(handler);
    return () => {
      messageHandlers.delete(handler);
    };
  }

  function send(payload: unknown): void {
    if (state !== State.OPEN || !socket) {
      throw new Error("WebSocket is not open");
    }
    socket.send(JSON.stringify(payload));
  }

  function getState(): string {
    return state;
  }

  function onStateChange(handler: StateHandler): () => void {
    stateHandlers.add(handler);
    return () => {
      stateHandlers.delete(handler);
    };
  }

  return {
    connect,
    disconnect,
    subscribe,
    send,
    getState,
    onStateChange,
  };
}

let client: WebSocketClient | null = null;

export function getWebSocket(): WebSocketClient {
  if (client === null) {
    client = createWebSocketClient(WS_URL, { reconnect: true });
  }
  return client;
}

export { createWebSocketClient };
