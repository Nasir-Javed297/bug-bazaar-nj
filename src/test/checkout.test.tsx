// Checkout (tasks D3-2, D4-5): a successful order, a 409, and no duplicate order on retry.
// Server-side facts (stock, number of orders) are read from the mock database the handlers use.
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProduct } from "../mocks/db";
import { server } from "./setup";
import { cartItem, demoSession, renderApp, setScenarios } from "./utils";

const stockOf = (id: string) => getProduct(id)?.stock ?? NaN;

describe("checkout", () => {
  it("placing an order shows the confirmation, empties the cart and lowers the stock", async () => {
    const stockBefore = stockOf("p-0200");
    const { user, store } = renderApp("/checkout", {
      session: demoSession(),
      cart: [cartItem("p-0200", 2)],
    });

    await user.click(await screen.findByRole("button", { name: "Place order" }));

    expect(
      await screen.findByRole("heading", { name: "Thank you for your order!" }),
    ).toBeInTheDocument();
    expect(store.getState().cart.items).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Cart, 0 items" })).toBeInTheDocument();
    expect(stockOf("p-0200")).toBe(stockBefore - 2);
  });

  it("a 409 names the item that ran out and lowers the cart to the real stock", async () => {
    // Our cart still thinks p-0018 has 5 in stock (a stale copy); the server has 1.
    const item = cartItem("p-0018", 3, 5);
    expect(stockOf("p-0018")).toBe(1);
    const { user, store } = renderApp("/checkout", { session: demoSession(), cart: [item] });

    await user.click(await screen.findByRole("button", { name: "Place order" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      `Sorry, only 1 of "${item.name}" is left.`,
    );
    expect(store.getState().cart.items[0]?.quantity).toBe(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/checkout");
    expect(stockOf("p-0018")).toBe(1); // nothing was ordered
  });

  it("retrying after a lost reply returns the same order instead of creating a second one", async () => {
    const keys: (string | null)[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST" && request.url.endsWith("/orders")) {
        keys.push(request.headers.get("Idempotency-Key"));
      }
    });
    const stockBefore = stockOf("p-0300");
    // The server SAVES the order, then the reply is "lost" (500).
    setScenarios({ loseOrderResponse: true });
    const { user } = renderApp("/checkout", {
      session: demoSession(),
      cart: [cartItem("p-0300", 1)],
    });

    await user.click(await screen.findByRole("button", { name: "Place order" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You won't be charged twice.");
    expect(stockOf("p-0300")).toBe(stockBefore - 1); // the first attempt DID go through

    setScenarios({}); // the connection is back
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(
      await screen.findByRole("heading", { name: "Thank you for your order!" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]); // the retry reused the key...
    expect(stockOf("p-0300")).toBe(stockBefore - 1); // ...so stock went down only once
  });
});
