// "All products" (tasks D4-2, D4-3, then infinite loading): products load 24 at a time as the
// shopper scrolls (or presses "Load more products"), only the visible part is in the page, and
// every item still tells assistive technology where it is in the whole list.
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProduct } from "../mocks/db";
import { stockFeed } from "../mocks/stockFeed";
import { server } from "./setup";
import { renderApp, setScenarios } from "./utils";

describe("showing all 5,000 products", () => {
  it("loads 24 first, then 24 more on request, rendering only a small window of items", async () => {
    const { user } = renderApp("/");
    expect(await screen.findByText("5000 products")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Show"), "all");
    expect(screen.getByTestId("location")).toHaveTextContent("/?perPage=all");
    // Only the first batch is downloaded, not all 5,000.
    expect(await screen.findByText("Showing 24 of 5000 products")).toBeInTheDocument();

    const list = within(screen.getByRole("main")).getByRole("list");
    const items = within(list).getAllByRole("listitem");
    // Virtualized: a handful of rows, not every loaded card.
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(50);
    // A screen reader hears "item 1 of 5000", even though only 24 are loaded.
    expect(items[0]).toHaveAttribute("aria-posinset", "1");
    expect(items[0]).toHaveAttribute("aria-setsize", "5000");

    // Keyboard and screen-reader users load more with the button (scrolling does it automatically).
    await user.click(screen.getByRole("button", { name: "Load more products" }));
    expect(await screen.findByText("Showing 48 of 5000 products")).toBeInTheDocument();
  });

  it("keeps the loaded products when the next batch fails, and Try again recovers", async () => {
    const { user } = renderApp("/?perPage=all");
    expect(await screen.findByText("Showing 24 of 5000 products")).toBeInTheDocument();

    setScenarios({ networkDown: true });
    await user.click(screen.getByRole("button", { name: "Load more products" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load more products");
    // The first 24 are still there.
    expect(screen.getByText("Showing 24 of 5000 products")).toBeInTheDocument();

    setScenarios({});
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Showing 48 of 5000 products")).toBeInTheDocument();
  });

  it("updates stock live in the loaded batches", async () => {
    // When the page subscribes to p-0001, the server pushes a new stock level for it.
    server.use(
      stockFeed.addEventListener("connection", ({ client }) => {
        client.addEventListener("message", (event) => {
          if (String(event.data).includes("p-0001")) {
            client.send(JSON.stringify({ type: "stock", productId: "p-0001", stock: 2 }));
          }
        });
      }),
    );
    renderApp("/?perPage=all");
    expect(await screen.findByText("Showing 24 of 5000 products")).toBeInTheDocument();

    // p-0001 is the first product in the default order; check ITS card, not just any card.
    const name = getProduct("p-0001")?.name ?? "";
    const card = (await screen.findByRole("link", { name })).closest("article");
    expect(card).not.toBeNull();
    expect(await within(card as HTMLElement).findByText("Only 2 left")).toBeInTheDocument();
  });
});
