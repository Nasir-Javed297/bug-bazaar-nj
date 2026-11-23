// The 5,000-item list (tasks D4-2, D4-3): only the visible part is in the page, and every item
// still tells assistive technology where it is in the whole list.
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./utils";

describe("showing all 5,000 products", () => {
  it("renders only a small window of items, each announcing its position in the full list", async () => {
    const { user } = renderApp("/");
    expect(await screen.findByText("5000 products")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Show"), "all");
    const list = await within(screen.getByRole("main")).findByRole("list", {}, { timeout: 3000 });
    expect(screen.getByTestId("location")).toHaveTextContent("/?perPage=all");

    const items = within(list).getAllByRole("listitem");
    // Virtualized: a handful of rows, not 5,000 cards.
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(50);
    // A screen reader still hears "item 1 of 5000".
    expect(items[0]).toHaveAttribute("aria-posinset", "1");
    expect(items[0]).toHaveAttribute("aria-setsize", "5000");
  });
});
