// The Redux store: one object holding all shared client state.
//   state.api  -> server data cache (RTK Query): products, orders...
//   state.cart -> the shopping cart (task D3-1)
//   state.auth -> the logged-in session (task D3-1 / D3-3)
// Filters are NOT here: they live in the URL (task D2-2).
import { configureStore } from "@reduxjs/toolkit";
import { api } from "../api/apiSlice";
import { authReducer } from "./authSlice";
import { cartReducer } from "./cartSlice";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    cart: cartReducer,
    auth: authReducer,
  },
  // RTK Query's middleware runs the requests, tracks subscriptions and expires the cache.
  // In development, configureStore also adds checks that throw if state is mutated outside a
  // reducer, or if something non-serializable (a function, a class instance) is put in state.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

// Types derived from the store itself, so they update automatically when slices are added.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
