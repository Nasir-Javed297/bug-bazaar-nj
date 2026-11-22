// RTK Query: declares every endpoint once and generates React hooks for them.
// It adds caching, request de-duplication and loading/error tracking on top of client.ts.
import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { AuthState } from "../store/authSlice";
import type {
  CreateOrderRequest,
  Order,
  Product,
  ProductsQuery,
  ProductsResponse,
} from "../types/api";
import { apiRequest, toQueryString, type ClientError, type RequestOptions } from "./client";

/** What each endpoint's `query` returns: a path plus optional method/body/headers. */
export type QueryArgs = { path: string } & Pick<RequestOptions, "method" | "body" | "headers">;

/**
 * The bridge between RTK Query and our client. RTK Query calls it for every request and
 * passes an AbortSignal (so requests can be cancelled) and getState (to read the store).
 * The auth token is added HERE, once, so no component ever handles it.
 */
const clientBaseQuery: BaseQueryFn<QueryArgs, unknown, ClientError> = async (
  args,
  { signal, getState },
) => {
  // Only the auth part of the state is needed. (Using the full RootState type here would be
  // circular: RootState is itself computed from this API slice.)
  const token = (getState() as { auth: AuthState }).auth.session?.token ?? null;
  const result = await apiRequest<unknown>(args.path, { ...args, signal, token });
  return result.ok ? { data: result.data } : { error: result.error };
};

export type CreateOrderArgs = CreateOrderRequest & {
  /**
   * One key per checkout attempt. Retrying with the SAME key returns the SAME order instead of
   * creating a second one (see docs/api-contract.md and task D3-2).
   */
  idempotencyKey: string;
};

export const api = createApi({
  // Where this API's cache lives inside the Redux store: state.api
  reducerPath: "api",
  baseQuery: clientBaseQuery,
  tagTypes: ["Product"],
  endpoints: (build) => ({
    // build.query<ResponseType, ArgumentType>: READS data, results are cached.
    getProducts: build.query<ProductsResponse, ProductsQuery>({
      query: (query) => ({ path: `/products${toQueryString(query)}` }),
    }),
    getProduct: build.query<Product, string>({
      query: (id) => ({ path: `/products/${encodeURIComponent(id)}` }),
    }),
    getOrder: build.query<Order, string>({
      query: (id) => ({ path: `/orders/${encodeURIComponent(id)}` }),
    }),
    // build.mutation: CHANGES something on the server. Not cached; runs when you call it.
    createOrder: build.mutation<Order, CreateOrderArgs>({
      query: ({ items, idempotencyKey }) => ({
        path: "/orders",
        method: "POST",
        body: { items },
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    }),
  }),
});

// Hooks generated from the endpoint names: getProducts -> useGetProductsQuery,
// createOrder -> useCreateOrderMutation.
export const { useGetProductsQuery, useGetProductQuery, useGetOrderQuery, useCreateOrderMutation } =
  api;
