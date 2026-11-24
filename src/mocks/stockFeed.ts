// The mock live stock server (task D4-4), a WebSocket handled by MSW like the REST endpoints.
// Protocol (see src/types/api.ts):
//   browser -> server  { type: "subscribe", productIds: [...] }
//   server  -> browser { type: "stock", productId, stock }
// Every 1-2 s it picks one subscribed product and simulates another shopper buying 1-3 of it
// (or a restock), changes the stock in the mock database (so the REST API agrees), and sends it.
import { ws } from "msw";
import type { StockUpdateMessage } from "../types/api";
import { changeStock } from "./db";
import { getScenarios } from "./scenarios";

/** Matches ws://<any host>/ws/stock (dev server, preview, tests). */
export const stockFeed = ws.link(/\/ws\/stock$/);

const MAX_SUBSCRIPTIONS = 5000;

function readProductIds(data: unknown): string[] | undefined {
  if (typeof data !== "string") return undefined;
  try {
    const message: unknown = JSON.parse(data);
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "subscribe" &&
      "productIds" in message &&
      Array.isArray(message.productIds)
    ) {
      return message.productIds
        .filter((id): id is string => typeof id === "string")
        .slice(0, MAX_SUBSCRIPTIONS);
    }
  } catch {
    // not JSON: ignore
  }
  return undefined;
}

export const stockFeedHandler = stockFeed.addEventListener("connection", ({ client }) => {
  let subscribed: string[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Dev panel switch: simulate a lost connection shortly after connecting.
  if (getScenarios().dropStockFeed) {
    timer = setTimeout(() => client.close(1011, "Simulated connection loss"), 500);
    return;
  }

  client.addEventListener("message", (event) => {
    const ids = readProductIds(event.data);
    if (ids) subscribed = ids; // each subscribe replaces the previous list
  });

  const tick = () => {
    const productId = subscribed[Math.floor(Math.random() * subscribed.length)];
    if (productId) {
      // Mostly purchases (-1..-3), sometimes a restock (+5..+15), always a restock when sold out.
      const restock = Math.random() < 0.25;
      const delta = restock
        ? 5 + Math.floor(Math.random() * 11)
        : -(1 + Math.floor(Math.random() * 3));
      let stock = changeStock(productId, delta);
      if (stock === 0 && !restock) stock = changeStock(productId, 10);
      if (stock !== undefined) {
        const message: StockUpdateMessage = { type: "stock", productId, stock };
        client.send(JSON.stringify(message));
      }
    }
    timer = setTimeout(tick, 1000 + Math.random() * 1000);
  };
  timer = setTimeout(tick, 1000);

  // The server cleans up too: no timers left running for a closed connection.
  client.addEventListener("close", () => clearTimeout(timer));
});
