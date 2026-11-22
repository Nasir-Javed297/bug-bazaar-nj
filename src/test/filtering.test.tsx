// Filtering (tasks D2-2, D4-5): used through the real UI, checked against what the server returns.
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { queryProducts } from "../mocks/db";
import { renderApp } from "./utils";

describe("filtering the catalogue", () => {
  it("search + category show only matching products, and the URL holds the filters", async () => {
    const { user } = renderApp("/");
    expect(await screen.findByText("5000 products")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search products"), "debug");
    await user.selectOptions(screen.getByLabelText("Category"), "ducks");

    // The same answer the server gives for this query.
    const expected = queryProducts({ search: "debug", category: "ducks" }).total;
    expect(await screen.findByText(`${expected} products`)).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/?search=debug&category=ducks");

    const names = within(screen.getByRole("list", { name: "" }))
      .getAllByRole("link")
      .map((link) => link.textContent ?? "");
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((name) => /debug/i.test(name) && /duck/i.test(name))).toBe(true);
  });

  it("a shared link opens the same filtered view, and Clear filters resets it", async () => {
    const { user } = renderApp("/?category=coffee&inStock=true&sort=price-asc");

    const cheapestCoffeeInStock = queryProducts({
      category: "coffee",
      inStock: true,
      sort: "price-asc",
    }).items[0];
    expect(await screen.findByRole("link", { name: cheapestCoffeeInStock?.name })).toBeVisible();
    expect(screen.getByLabelText("Category")).toHaveValue("coffee");
    expect(screen.getByLabelText("In stock only")).toBeChecked();
    expect(screen.getByLabelText("Sort by")).toHaveValue("price-asc");

    await user.click(screen.getAllByRole("button", { name: "Clear filters" })[0]!);
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/));
    expect(await screen.findByText("5000 products")).toBeInTheDocument();
  });
});
