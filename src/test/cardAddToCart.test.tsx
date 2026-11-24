// "Add to cart" on the product cards in the list: adds without leaving the list, follows the same
// stock rules as the details page, and each button names its product for screen readers.
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProduct, queryProducts } from "../mocks/db";
import { cartItem, renderApp } from "./utils";

/** The first page of the list, as the server returns it (default order, 24 per page). */
const firstPage = () => queryProducts({ page: 1, pageSize: 24 }).items;

describe("add to cart from the product list", () => {
  it("adds the product, stays on the list, and shows how many are in the cart", async () => {
    const product = firstPage().find((item) => item.stock > 2);
    if (!product) throw new Error("No product with stock on the first page");
    const { user } = renderApp("/");

    const button = await screen.findByRole("button", { name: `Add to cart, ${product.name}` });
    await user.click(button);

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/); // still on the list
    expect(screen.getByRole("link", { name: "Cart 1 item" })).toBeInTheDocument();
    const card = button.closest("article") as HTMLElement;
    expect(within(card).getByRole("status")).toHaveTextContent("In your cart (1)");

    // The same button now adds another one.
    await user.click(within(card).getByRole("button", { name: `Add another, ${product.name}` }));
    expect(within(card).getByRole("status")).toHaveTextContent("In your cart (2)");
    expect(screen.getByRole("link", { name: "Cart 2 items" })).toBeInTheDocument();
  });

  it("can't add a sold-out product", async () => {
    const soldOut = firstPage().find((item) => item.stock === 0);
    if (!soldOut) throw new Error("No sold-out product on the first page");
    renderApp("/");
    expect(await screen.findByRole("button", { name: `Sold out, ${soldOut.name}` })).toBeDisabled();
  });

  it("can't add more than the stock", async () => {
    const product = firstPage().find((item) => item.stock > 0);
    if (!product) throw new Error("No product with stock on the first page");
    const stock = getProduct(product.id)?.stock ?? 0;
    // Every available unit is already in the cart.
    renderApp("/", { cart: [cartItem(product.id, stock)] });
    expect(
      await screen.findByRole("button", { name: `All in cart, ${product.name}` }),
    ).toBeDisabled();
  });
});
