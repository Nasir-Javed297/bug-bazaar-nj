// Small indicator for the live stock feed (task D4-4): "Live stock" or "Reconnecting…".
import type { FeedStatus } from "../api/stockFeed";

const LABELS: Record<FeedStatus, string> = {
  connecting: "Connecting to live stock…",
  live: "Live stock",
  reconnecting: "Live stock paused, reconnecting…",
  closed: "Live stock off",
};

type LiveStockStatusProps = {
  status: FeedStatus;
};

export function LiveStockStatus({ status }: LiveStockStatusProps) {
  return (
    // role="status": screen readers hear when the connection is lost or comes back.
    <p className={`live-status live-status--${status}`} role="status">
      <span className="live-status__dot" aria-hidden="true" />
      {LABELS[status]}
    </p>
  );
}
