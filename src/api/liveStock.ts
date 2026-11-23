// Applies a live stock update (task D4-4) everywhere it's shown, without refetching:
// the product's details cache entry, every cached product list (paged or "All") that contains it,
// and the cart.
import { stockUpdated } from "../store/cartSlice";
import type { AppDispatch, RootState } from "../store/store";
import type { ProductsQuery, StockUpdateMessage } from "../types/api";
import { api, type ProductsFeedQuery } from "./apiSlice";

/** A thunk: a function the store runs with `dispatch` and `getState`. */
export const stockUpdateReceived =
  ({ productId, stock }: StockUpdateMessage) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    // 1. The details page's cache entry (does nothing if that product isn't cached).
    dispatch(
      api.util.updateQueryData("getProduct", productId, (product) => {
        product.stock = stock;
      }),
    );

    // 2. Every cached list that contains this product. The tags added for cache invalidation
    //    (D3-5) tell us which entries those are.
    for (const entry of api.util.selectInvalidatedBy(getState(), [
      { type: "Product", id: productId },
    ])) {
      if (entry.endpointName === "getProducts") {
        dispatch(
          // The cache key's original arguments: a ProductsQuery for this endpoint.
          api.util.updateQueryData("getProducts", entry.originalArgs as ProductsQuery, (list) => {
            const item = list.items.find((product) => product.id === productId);
            if (item) item.stock = stock;
          }),
        );
      } else if (entry.endpointName === "getProductsFeed") {
        // "All products" (infinite loading): the product is in one of the loaded batches.
        dispatch(
          api.util.updateQueryData(
            "getProductsFeed",
            entry.originalArgs as ProductsFeedQuery,
            (feed) => {
              for (const page of feed.pages) {
                const item = page.items.find((product) => product.id === productId);
                if (item) item.stock = stock;
              }
            },
          ),
        );
      }
    }

    // 3. The cart: lowers the quantity if it's now above the stock (ignored if not in the cart).
    dispatch(stockUpdated({ productId, stock }));
  };
