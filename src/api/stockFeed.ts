// The live stock feed (task D4-4): a WebSocket connection that pushes stock changes.
// Part of the data layer: pages never open sockets themselves (they use useLiveStock).
//
// - Subscribes to the products the page shows: { type: "subscribe", productIds }
// - Recovers after a disconnect: reconnects with exponential backoff + jitter
// - Stops cleanly: close() cancels retries and never reconnects
import {
  isStockUpdateMessage,
  type StockSubscribeMessage,
  type StockUpdateMessage,
} from "../types/api";

export type FeedStatus = "connecting" | "live" | "reconnecting" | "closed";

type StockFeedOptions = {
  url: string;
  onUpdate: (update: StockUpdateMessage) => void;
  onStatus: (status: FeedStatus) => void;
};

export type StockFeed = {
  /** Replace the list of products to receive updates for. */
  subscribe: (productIds: string[]) => void;
  /** Close for good: no reconnecting. Call it when the page closes. */
  close: () => void;
};

/** First retry after ~1 s, then 2, 4, 8... capped at 30 s. */
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
/**
 * A connection only counts as healthy after staying open this long. One that opens and drops
 * straight away (an overloaded or crashing server) is a failure, so the next wait still grows.
 * (Resetting on "open" kept the wait at ~1 s forever: found by testing with the Dev panel switch.)
 */
const STABLE_AFTER_MS = 5000;

/**
 * Exponential backoff with jitter: double the wait after each failed attempt (so a broken server
 * isn't hammered), and randomize it a little (so thousands of browsers don't all reconnect in the
 * same millisecond after a server restart).
 */
export function reconnectDelay(attempt: number): number {
  const exponential = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (attempt - 1));
  return exponential * (0.5 + Math.random() * 0.5);
}

export function openStockFeed({ url, onUpdate, onStatus }: StockFeedOptions): StockFeed {
  let socket: WebSocket | null = null;
  let productIds: string[] = [];
  let failedAttempts = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stableTimer: ReturnType<typeof setTimeout> | undefined;
  let closedByUs = false;

  const sendSubscription = () => {
    if (socket?.readyState !== WebSocket.OPEN) return; // sent on "open" instead
    const message: StockSubscribeMessage = { type: "subscribe", productIds };
    socket.send(JSON.stringify(message));
  };

  const connect = () => {
    clearTimeout(retryTimer);
    onStatus(failedAttempts === 0 ? "connecting" : "reconnecting");
    const current = new WebSocket(url);
    socket = current;

    current.addEventListener("open", () => {
      // Reset the backoff only once the connection has proven stable.
      stableTimer = setTimeout(() => (failedAttempts = 0), STABLE_AFTER_MS);
      onStatus("live");
      sendSubscription();
    });

    current.addEventListener("message", (event) => {
      try {
        const data: unknown = JSON.parse(String(event.data));
        if (isStockUpdateMessage(data)) onUpdate(data); // ignore anything else
      } catch {
        // not JSON: ignore
      }
    });

    // Fires after any disconnect: server closed it, network dropped, or the server is down.
    current.addEventListener("close", () => {
      clearTimeout(stableTimer);
      if (socket === current) socket = null;
      if (closedByUs) return; // we closed it on purpose: don't come back
      failedAttempts += 1;
      onStatus("reconnecting");
      retryTimer = setTimeout(connect, reconnectDelay(failedAttempts));
    });
  };

  // Back online after being offline? Don't wait for the backoff timer.
  const handleOnline = () => {
    if (!closedByUs && !socket) connect();
  };
  window.addEventListener("online", handleOnline);

  connect();

  return {
    subscribe(ids) {
      productIds = ids;
      sendSubscription();
    },
    close() {
      closedByUs = true; // set BEFORE closing, so the "close" handler doesn't reconnect
      clearTimeout(retryTimer);
      clearTimeout(stableTimer);
      window.removeEventListener("online", handleOnline);
      socket?.close(1000, "Page closed");
      socket = null;
      onStatus("closed");
    },
  };
}
