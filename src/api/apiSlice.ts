// RTK Query: declares every endpoint once and generates React hooks for them.
// It adds caching, request de-duplication and loading/error tracking on top of client.ts.
import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { Product, ProductsQuery, ProductsResponse } from "../types/api";
import { apiRequest, toQueryString, type ClientError, type RequestOptions } from "./client";

/** What each endpoint's `query` returns: a path plus optional method/body/headers. */
export type QueryArgs = { path: string } & Pick<RequestOptions, "method" | "body" | "headers">;

/**
 * The bridge between RTK Query and our client. RTK Query calls it for every request and
 * passes an AbortSignal, so requests it no longer needs can be cancelled.
 * (The auth token is added here in task D3-3.)
 */
const clientBaseQuery: BaseQueryFn<QueryArgs, unknown, ClientError> = async (args, { signal }) => {
  const result = await apiRequest<unknown>(args.path, { ...args, signal });
  return result.ok ? { data: result.data } : { error: result.error };
};

export const api = createApi({
  // Where this API's cache lives inside the Redux store: state.api
  reducerPath: "api",
  baseQuery: clientBaseQuery,
  tagTypes: ["Product"],
  endpoints: (build) => ({
    // build.query<ResponseType, ArgumentType>
    getProducts: build.query<ProductsResponse, ProductsQuery>({
      query: (query) => ({ path: `/products${toQueryString(query)}` }),
    }),
    getProduct: build.query<Product, string>({
      query: (id) => ({ path: `/products/${encodeURIComponent(id)}` }),
    }),
  }),
});

// Hooks generated from the endpoint names: getProducts -> useGetProductsQuery.
export const { useGetProductsQuery, useGetProductQuery } = api;
