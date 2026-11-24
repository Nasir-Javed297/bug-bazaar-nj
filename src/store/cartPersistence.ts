// Saves the cart to localStorage and loads it back on start-up, so the cart survives a reload.
// Saved data is validated: anything old, edited or corrupt falls back to an empty cart.
import { isRecord, readStorage } from "../utils/storage";
import type { CartItem, CartState } from "./cartSlice";

export const CART_STORAGE_KEY = "bug-bazaar:cart";

const isWholeNumber = (value: unknown, min: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min;

function isCartItem(value: unknown): value is CartItem {
  return (
    isRecord(value) &&
    typeof value.productId === "string" &&
    typeof value.name === "string" &&
    typeof value.imageUrl === "string" &&
    isWholeNumber(value.price, 0) &&
    isWholeNumber(value.stock, 0) &&
    isWholeNumber(value.quantity, 1)
  );
}

export function isCartState(value: unknown): value is CartState {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isCartItem);
}

/** The cart to start with: the saved one if it's valid, otherwise an empty cart. */
export function loadCart(): CartState {
  return readStorage(CART_STORAGE_KEY, isCartState) ?? { items: [] };
}
