// Cart logic (task D4-5): the rules a shopper relies on, tested through the real reducer and
// selectors. We check the resulting state, not which internal code ran.
import { describe, expect, it } from "vitest";
import type { Product } from "../types/api";
import { isCartState } from "./cartPersistence";
import {
  cartReducer,
  itemAdded,
  quantityChanged,
  selectCartCount,
  selectCartTotal,
  stockUpdated,
  type CartState,
} from "./cartSlice";
import type { RootState } from "./store";

const duck: Product = {
  id: "p-duck",
  name: "Debug Duck",
  price: 1999,
  category: "ducks",
  stock: 3,
  rating: 4.5,
  imageUrl: "/images/ducks.svg",
};
const keyboard: Product = { ...duck, id: "p-kb", name: "Clicky Keyboard", price: 8999, stock: 10 };

const empty: CartState = { items: [] };
/** Runs a sequence of actions through the real reducer. */
const run = (...actions: Parameters<typeof cartReducer>[1][]) => actions.reduce(cartReducer, empty);
/** Selectors read the whole app state; only the cart matters here. */
const asRoot = (cart: CartState) => ({ cart }) as unknown as RootState;

describe("cart", () => {
  it("adding the same product twice increases its quantity instead of adding a second line", () => {
    const cart = run(itemAdded({ product: duck }), itemAdded({ product: duck }));
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(2);
  });

  it("never lets a quantity go above the stock", () => {
    const cart = run(
      itemAdded({ product: duck, quantity: 2 }),
      itemAdded({ product: duck, quantity: 5 }), // stock is 3
    );
    expect(cart.items[0]?.quantity).toBe(3);

    const changed = cartReducer(cart, quantityChanged({ productId: duck.id, quantity: 99 }));
    expect(changed.items[0]?.quantity).toBe(3);
  });

  it("does not add a sold-out product", () => {
    const cart = run(itemAdded({ product: { ...duck, stock: 0 } }));
    expect(cart.items).toHaveLength(0);
  });

  it("removes a line when its quantity is set to 0", () => {
    const cart = run(
      itemAdded({ product: duck }),
      quantityChanged({ productId: duck.id, quantity: 0 }),
    );
    expect(cart.items).toHaveLength(0);
  });

  it("lowers the quantity to the real stock reported by the server, or removes a sold-out line", () => {
    const cart = run(itemAdded({ product: keyboard, quantity: 6 }), itemAdded({ product: duck }));
    const lowered = cartReducer(cart, stockUpdated({ productId: keyboard.id, stock: 2 }));
    expect(lowered.items.find((i) => i.productId === keyboard.id)?.quantity).toBe(2);

    const soldOut = cartReducer(lowered, stockUpdated({ productId: duck.id, stock: 0 }));
    expect(soldOut.items.map((i) => i.productId)).toEqual([keyboard.id]);
  });

  it("derives the item count and the total (in cents) from the lines", () => {
    const cart = run(
      itemAdded({ product: duck, quantity: 2 }), // 2 x 1999
      itemAdded({ product: keyboard }), // 1 x 8999
    );
    expect(selectCartCount(asRoot(cart))).toBe(3);
    expect(selectCartTotal(asRoot(cart))).toBe(2 * 1999 + 8999);
  });

  it("rejects a tampered saved cart (e.g. a negative quantity) when loading it", () => {
    const good = run(itemAdded({ product: duck }));
    expect(isCartState(good)).toBe(true);
    expect(isCartState({ items: [{ ...good.items[0], quantity: -5 }] })).toBe(false);
    expect(isCartState({ items: "nope" })).toBe(false);
  });
});
