// The Redux store: one object holding all shared client state.
//   state.api  -> server data cache (RTK Query): products, orders...
//   state.cart -> the shopping cart (task D3-1), saved to localStorage (task D3-2)
//   state.auth -> the logged-in session (task D3-1), saved to sessionStorage (task D3-3)
// Filters are NOT here: they live in the URL (task D2-2).
import { configureStore } from "@reduxjs/toolkit";
import { api } from "../api/apiSlice";
import { removeStorage, writeStorage } from "../utils/storage";
import { loadAuth, SESSION_STORAGE_KEY } from "./authPersistence";
import { authReducer } from "./authSlice";
import { CART_STORAGE_KEY, loadCart } from "./cartPersistence";
import { cartReducer } from "./cartSlice";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    cart: cartReducer,
    auth: authReducer,
  },
  // Start with what was saved before the last reload (validated; defaults if missing/corrupt).
  preloadedState: { cart: loadCart(), auth: loadAuth() },
  // RTK Query's middleware runs the requests, tracks subscriptions and expires the cache.
  // In development, configureStore also adds checks that throw if state is mutated outside a
  // reducer, or if something non-serializable (a function, a class instance) is put in state.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

// Save the cart and the session whenever they change. State is immutable, so "changed" simply
// means "a different object": a cheap reference check, no deep comparison needed.
let previousCart = store.getState().cart;
let previousSession = store.getState().auth.session;
store.subscribe(() => {
  const { cart, auth } = store.getState();
  if (cart !== previousCart) {
    previousCart = cart;
    writeStorage(CART_STORAGE_KEY, cart);
  }
  if (auth.session !== previousSession) {
    previousSession = auth.session;
    if (auth.session) writeStorage(SESSION_STORAGE_KEY, auth.session, "session");
    else removeStorage(SESSION_STORAGE_KEY, "session"); // logged out: forget the token
  }
});

// Types derived from the store itself, so they update automatically when slices are added.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
