// Live stock over WebSocket (task D4-4): updates appear without a refresh, the feed recovers
// after a disconnect, and it stops when the page closes.
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { stockFeed } from "../mocks/stockFeed";
import { server } from "./setup";
import { renderApp, setScenarios } from "./utils";

describe("live stock", () => {
  it("shows a stock change pushed by the server, without reloading", async () => {
    // An extra listener: when the page subscribes to p-0042, push a specific stock level.
    server.use(
      stockFeed.addEventListener("connection", ({ client }) => {
        client.addEventListener("message", (event) => {
          if (String(event.data).includes("p-0042")) {
            client.send(JSON.stringify({ type: "stock", productId: "p-0042", stock: 3 }));
          }
        });
      }),
    );
    renderApp("/products/p-0042");

    expect(await screen.findByText("Only 3 left")).toBeInTheDocument();
    expect(screen.getByText("Live stock")).toBeInTheDocument();
  });

  it("recovers after the connection drops", async () => {
    setScenarios({ dropStockFeed: true }); // the server cuts every connection
    renderApp("/products/p-0042");
    expect(await screen.findByText("Live stock paused, reconnecting…")).toBeInTheDocument();

    setScenarios({}); // the server is healthy again...
    window.dispatchEvent(new Event("online")); // ...and the browser is back online
    expect(await screen.findByText("Live stock", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("closes the connection when the page closes, and doesn't reconnect", async () => {
    const events: string[] = [];
    server.use(
      stockFeed.addEventListener("connection", ({ client }) => {
        events.push("open");
        client.addEventListener("close", () => events.push("close"));
      }),
    );
    const { user } = renderApp("/products/p-0042");
    expect(await screen.findByText("Live stock")).toBeInTheDocument();
    const opened = events.filter((event) => event === "open").length;

    await user.click(screen.getByRole("link", { name: "Cart 0 items" })); // leave the page
    expect(await screen.findByRole("heading", { name: "Your cart" })).toBeInTheDocument();

    await waitFor(() => expect(events.filter((event) => event === "close")).toHaveLength(opened));
    await new Promise((resolve) => setTimeout(resolve, 1500)); // longer than a retry would wait
    expect(events.filter((event) => event === "open")).toHaveLength(opened); // no reconnect
  });
});
