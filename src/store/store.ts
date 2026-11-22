// The Redux store: one object holding all shared state.
// For now it only holds the RTK Query cache. The cart and auth slices are added in task D3-1.
import { configureStore } from "@reduxjs/toolkit";
import { api } from "../api/apiSlice";

export const store = configureStore({
  reducer: {
    // The API cache lives at state.api
    [api.reducerPath]: api.reducer,
  },
  // RTK Query's middleware runs the requests, tracks subscriptions and expires the cache.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

// Types derived from the store itself, so they update automatically when slices are added.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
