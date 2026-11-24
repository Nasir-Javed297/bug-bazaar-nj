// The shopping cart: state, the ONLY ways it can change (reducers), and derived values (selectors).
import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Product } from "../types/api";
import type { RootState } from "./store";

/**
 * One line in the cart. Besides the id and quantity, we keep a snapshot of what the cart page
 * needs to display (name, price, image) and the stock, so quantities can be limited to it.
 * The server re-checks stock at checkout (409 if it ran out), so a slightly old snapshot is safe.
 */
export type CartItem = Pick<Product, "name" | "price" | "imageUrl" | "stock"> & {
  productId: string;
  quantity: number;
};

export type CartState = {
  // Only the items are stored. Count and total are DERIVED by selectors below, never stored,
  // so they can't get out of sync with the items.
  items: CartItem[];
};

const initialState: CartState = { items: [] };

/** A whole number between 0 and the stock. The single rule for every quantity in the cart. */
function clampQuantity(quantity: number, stock: number): number {
  return Math.max(0, Math.min(Math.floor(quantity), stock));
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  // Each reducer handles one action. Action names describe WHAT HAPPENED ("itemAdded"),
  // and the reducer decides HOW the state changes.
  //
  // The code below looks like it mutates `state` (push, =). It doesn't: Redux Toolkit uses
  // Immer, which records these changes and produces a new, immutable state object.
  reducers: {
    itemAdded(state, action: PayloadAction<{ product: Product; quantity?: number }>) {
      const { product, quantity = 1 } = action.payload;
      const existing = state.items.find((item) => item.productId === product.id);

      if (existing) {
        // Refresh the snapshot with the latest product data, then add (never beyond stock).
        existing.price = product.price;
        existing.stock = product.stock;
        existing.quantity = clampQuantity(existing.quantity + quantity, product.stock);
      } else {
        const clamped = clampQuantity(quantity, product.stock);
        if (clamped === 0) return; // out of stock: nothing to add
        state.items.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          stock: product.stock,
          quantity: clamped,
        });
      }
      state.items = state.items.filter((item) => item.quantity > 0);
    },

    quantityChanged(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.items.find((line) => line.productId === action.payload.productId);
      if (!item) return;
      item.quantity = clampQuantity(action.payload.quantity, item.stock);
      // Setting a quantity of 0 removes the line.
      state.items = state.items.filter((line) => line.quantity > 0);
    },

    /**
     * The server told us the real stock (e.g. a 409 at checkout). Update it and lower the
     * quantity if needed; a line whose product sold out is removed.
     */
    stockUpdated(state, action: PayloadAction<{ productId: string; stock: number }>) {
      const item = state.items.find((line) => line.productId === action.payload.productId);
      if (!item) return;
      item.stock = action.payload.stock;
      item.quantity = clampQuantity(item.quantity, item.stock);
      state.items = state.items.filter((line) => line.quantity > 0);
    },

    itemRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.productId !== action.payload);
    },

    cartCleared() {
      return initialState;
    },
  },
});

// createSlice generates an "action creator" for each reducer:
// itemAdded({ product }) -> { type: "cart/itemAdded", payload: { product } }
export const { itemAdded, quantityChanged, stockUpdated, itemRemoved, cartCleared } =
  cartSlice.actions;
export const cartReducer = cartSlice.reducer;

// ---------- Selectors: read and DERIVE values from the state ----------

export const selectCartItems = (state: RootState) => state.cart.items;

/**
 * Total number of items (2 ducks + 1 keyboard = 3). Derived, not stored.
 * createSelector memoizes: it only re-adds when `items` changes, not on every render.
 */
export const selectCartCount = createSelector([selectCartItems], (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0),
);

/** Total price in cents. Integer maths, so no floating-point rounding errors. */
export const selectCartTotal = createSelector([selectCartItems], (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0),
);

/** How many of one product are already in the cart (0 if none). */
export const selectQuantityInCart = (state: RootState, productId: string) =>
  state.cart.items.find((item) => item.productId === productId)?.quantity ?? 0;
