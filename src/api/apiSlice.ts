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
    }),
  }),
});

// Hooks generated from the endpoint names: getProducts -> useGetProductsQuery,
// createOrder -> useCreateOrderMutation.
export const {
  useGetProductsQuery,
  useGetProductQuery,
  useGetOrderQuery,
  useGetMeQuery,
  useCreateOrderMutation,
  useLoginMutation,
} = api;
