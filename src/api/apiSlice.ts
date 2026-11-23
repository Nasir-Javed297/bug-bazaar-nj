// RTK Query: declares every endpoint once and generates React hooks for them.
// It adds caching, request de-duplication and loading/error tracking on top of client.ts.
import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { loggedOut, type AuthState } from "../store/authSlice";
import type {
  CreateOrderRequest,
  LoginRequest,
  LoginResponse,
  Order,
  Product,
  ProductsQuery,
  ProductsResponse,
  User,
} from "../types/api";
import { apiRequest, toQueryString, type ClientError, type RequestOptions } from "./client";

/** What each endpoint's `query` returns: a path plus optional method/body/headers. */
export type QueryArgs = { path: string } & Pick<RequestOptions, "method" | "body" | "headers">;

/**
 * The bridge between RTK Query and our client. RTK Query calls it for every request and
 * passes an AbortSignal (so requests can be cancelled), getState (to read the store) and
 * dispatch. Two auth rules live HERE, once, so no page has to repeat them:
 * - the token is added to every request;
 * - a 401 for a request that SENT a token means the session is no longer valid: clear it.
 */
const clientBaseQuery: BaseQueryFn<QueryArgs, unknown, ClientError> = async (
  args,
  { signal, getState, dispatch },
) => {
  // Only the auth part of the state is needed. (Using the full RootState type here would be
  // circular: RootState is itself computed from this API slice.)
  const token = (getState() as { auth: AuthState }).auth.session?.token ?? null;
  const result = await apiRequest<unknown>(args.path, { ...args, signal, token });
  if (result.ok) return { data: result.data };

  // Task D3-3: "a 401 clears the session". Without a token (e.g. a wrong password on the
  // login form) there's no session to clear, and the page shows its own message instead.
  if (result.error.status === 401 && token) {
    dispatch(loggedOut("expired"));
  }
  return { error: result.error };
};

export type CreateOrderArgs = CreateOrderRequest & {
  /**
   * One key per checkout attempt. Retrying with the SAME key returns the SAME order instead of
   * creating a second one (see docs/api-contract.md and task D3-2).
   */
  idempotencyKey: string;
};

/** How long product data stays cached after no page uses it (task D3-5). */
const PRODUCT_CACHE_SECONDS = 5 * 60;

/** "All products" loads this many at a time, as the shopper scrolls (infinite loading). */
export const PRODUCTS_BATCH_SIZE = 24;

/** The filters for the infinite list: everything except paging, which the endpoint handles. */
export type ProductsFeedQuery = Omit<ProductsQuery, "page" | "pageSize">;

export const api = createApi({
  // Where this API's cache lives inside the Redux store: state.api
  reducerPath: "api",
  baseQuery: clientBaseQuery,

  // ---------- Caching policy (task D3-5, explained in docs/decisions.md) ----------
  // When a page mounts: cached data younger than 60 s is reused with NO request. Older data is
  // shown immediately AND refreshed in the background ("stale-while-revalidate"); pages read
  // `currentData`, which keeps the old copy on screen during that refresh, so nothing flashes.
  refetchOnMountOrArgChange: 60,

  // Tags label cache entries so a mutation can say which ones are now out of date.
  tagTypes: ["Product"],

  endpoints: (build) => ({
    // build.query<ResponseType, ArgumentType>: READS data, results are cached.
    getProducts: build.query<ProductsResponse, ProductsQuery>({
      query: (query) => ({ path: `/products${toQueryString(query)}` }),
      keepUnusedDataFor: PRODUCT_CACHE_SECONDS,
      // A list is tagged with EVERY product it contains, so changing one product's stock
      // refreshes exactly the lists that show it.
      providesTags: (result) =>
        result ? result.items.map((product) => ({ type: "Product" as const, id: product.id })) : [],
    }),
    // build.infiniteQuery<ResponseType, ArgumentType, PageParamType>: one cache entry that holds
    // several pages ("batches") of the same list. Used for "All products": instead of downloading
    // all 5,000 products at once (694 KB), it loads 24 (3.4 KB) and adds 24 more each time
    // fetchNextPage() is called. The page number is the "page param".
    getProductsFeed: build.infiniteQuery<ProductsResponse, ProductsFeedQuery, number>({
      infiniteQueryOptions: {
        initialPageParam: 1,
        // The next page number, or undefined when every product is loaded (stops loading).
        getNextPageParam: (lastPage, _allPages, lastPageParam) =>
          lastPageParam * PRODUCTS_BATCH_SIZE < lastPage.total ? lastPageParam + 1 : undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        path: `/products${toQueryString({ ...queryArg, page: pageParam, pageSize: PRODUCTS_BATCH_SIZE })}`,
      }),
      keepUnusedDataFor: PRODUCT_CACHE_SECONDS,
      // Same tags as getProducts: every product in every loaded batch, so an order or a sold-out
      // reply refreshes this list too (task D3-5), and live stock can find it (D4-4).
      providesTags: (result) =>
        result
          ? result.pages.flatMap((page) =>
              page.items.map((product) => ({ type: "Product" as const, id: product.id })),
            )
          : [],
    }),
    getProduct: build.query<Product, string>({
      query: (id) => ({ path: `/products/${encodeURIComponent(id)}` }),
      keepUnusedDataFor: PRODUCT_CACHE_SECONDS,
      providesTags: (_result, _error, id) => [{ type: "Product", id }],
    }),
    getOrder: build.query<Order, string>({
      query: (id) => ({ path: `/orders/${encodeURIComponent(id)}` }),
    }),
    /** The logged-in user. 401 if the token is missing or expired (which clears the session). */
    getMe: build.query<User, void>({
      query: () => ({ path: "/me" }),
    }),
    // build.mutation: CHANGES something on the server. Not cached; runs when you call it.
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({ path: "/login", method: "POST", body: credentials }),
    }),
    createOrder: build.mutation<Order, CreateOrderArgs>({
      query: ({ items, idempotencyKey }) => ({
        path: "/orders",
        method: "POST",
        body: { items },
        headers: { "Idempotency-Key": idempotencyKey },
      }),
      // Task D3-5: "refresh stock after an order is placed". Mark every ordered product as out
      // of date; RTK Query refetches every cached entry with those tags (details pages AND the
      // lists that contain them). After a 409, the sold-out product's cached stock is also
      // proven wrong, so it's refreshed too.
      invalidatesTags: (result, error, { items }) => {
        if (result)
          return items.map(({ productId }) => ({ type: "Product" as const, id: productId }));
        const soldOutId = error?.status === 409 ? error.details?.productId : undefined;
        return soldOutId ? [{ type: "Product" as const, id: soldOutId }] : [];
      },
    }),
  }),
});

// Hooks generated from the endpoint names: getProducts -> useGetProductsQuery,
// createOrder -> useCreateOrderMutation.
export const {
  useGetProductsQuery,
  useGetProductsFeedInfiniteQuery,
  useGetProductQuery,
  useGetOrderQuery,
  useGetMeQuery,
  useCreateOrderMutation,
  useLoginMutation,
} = api;
