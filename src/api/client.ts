// The ONLY place in the app that calls fetch() (enforced by ESLint, see eslint.config.js).
// Responsibilities: build the URL, set headers (JSON, auth token), send the request,
// parse the JSON, and turn every kind of failure into one consistent `ClientError`.
import { config } from "../config";
import type { ApiError } from "../types/api";

/** Every failure the app can see, in one shape. */
export type ClientError = {
  /** HTTP status code, or 0 when there was no response at all (offline, aborted). */
  status: number;
  /** Machine-readable code: from the server (e.g. "OUT_OF_STOCK") or our own ("NETWORK_ERROR"). */
  code: string;
  /** Developer-facing message, for logs. The UI shows its own friendly text (task D3-4). */
  message: string;
  /** 400: field -> message. 409: which product ran out. */
  details?: Record<string, string>;
};

/** A result instead of a thrown error, so callers can't forget to handle failure. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ClientError };

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Sent as JSON. */
  body?: unknown;
  /** Adds `Authorization: Bearer <token>`. */
  token?: string | null;
  headers?: Record<string, string>;
  /** Lets the caller cancel the request (e.g. the user switched to another product). */
  signal?: AbortSignal;
};

type QueryValue = string | number | boolean | undefined;

/**
 * Turns `{ search: "duck", page: 2, inStock: false }` into `?search=duck&page=2`.
 * Empty strings, `false` and `undefined` are left out to keep URLs short.
 */
export function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function isApiErrorBody(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const { error } = value;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

/** Type guard for code that receives an unknown error (e.g. from RTK Query). */
export function isClientError(value: unknown): value is ClientError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof value.status === "number" &&
    "code" in value &&
    typeof value.code === "string"
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (err: unknown) {
    // fetch only throws when there is NO response: offline, DNS failure, or cancelled.
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? { status: 0, code: "ABORTED", message: "The request was cancelled." }
        : { status: 0, code: "NETWORK_ERROR", message: "Could not reach the server." },
    };
  }

  const body = await readJson(response);

  // fetch does NOT fail on 4xx/5xx: we have to check response.ok ourselves.
  if (!response.ok) {
    if (isApiErrorBody(body)) {
      return { ok: false, error: { status: response.status, ...body.error } };
    }
    return {
      ok: false,
      error: {
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: `Request failed with status ${response.status}.`,
      },
    };
  }

  // We trust a successful response to match the contract (docs/api-contract.md).
  // A schema validator (e.g. zod) could check this at runtime: see docs/decisions.md.
  return { ok: true, data: body as T };
}
