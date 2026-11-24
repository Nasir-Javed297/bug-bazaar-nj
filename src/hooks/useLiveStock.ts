// Keeps the stock of the given products live while the component is on screen (task D4-4).
// Opens the feed when the page opens and closes it when the page closes (effect cleanup).
import { useEffect, useRef, useState } from "react";
import { stockUpdateReceived } from "../api/liveStock";
import { openStockFeed, type FeedStatus, type StockFeed } from "../api/stockFeed";
import { config } from "../config";
import { useAppDispatch } from "../store/hooks";

export function useLiveStock(productIds: string[]): FeedStatus {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const feedRef = useRef<StockFeed | null>(null);

  // One connection for the lifetime of the page.
  useEffect(() => {
    const feed = openStockFeed({
      url: config.stockFeedUrl,
      onUpdate: (update) => dispatch(stockUpdateReceived(update)),
      onStatus: setStatus,
    });
    feedRef.current = feed;
    return () => {
      feed.close(); // the page closed: stop the feed, cancel any reconnect
      feedRef.current = null;
    };
  }, [dispatch]);

  // Re-subscribe when the products on screen change (new page, filter, sort...).
  // A string key, so a new array with the same ids doesn't re-send the subscription.
  const key = productIds.join(",");
  useEffect(() => {
    feedRef.current?.subscribe(key ? key.split(",") : []);
  }, [key]);

  return status;
}
