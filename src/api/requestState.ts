// Adapter: converts an RTK Query hook result (several booleans) into our RequestState union
// (one `status`), so components handle every state with a single switch.
import type { RequestState } from "../types/request";
import { isClientError, type ClientError } from "./client";

/** The parts of an RTK Query hook result that we need. */
type QueryResultLike<T> = {
  /** Data for the CURRENT arguments only (unlike `data`, which keeps the previous result). */
  currentData?: T;
  error?: unknown;
  isError: boolean;
  isUninitialized: boolean;
};

export function toClientError(error: unknown): ClientError {
  if (isClientError(error)) return error;
  // Anything else (e.g. an exception inside RTK Query) becomes a generic error.
  return { status: 0, code: "UNKNOWN_ERROR", message: "Something went wrong." };
}

/**
 * True for requests WE cancelled on purpose (see useCancelProductRequestOnLeave).
 * RTK Query reports those as `{ name: "AbortError" }`; our client reports `code: "ABORTED"`.
 */
function isAbortError(error: unknown): boolean {
  if (isClientError(error)) return error.code === "ABORTED";
  return (
    typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"
  );
}

export function toRequestState<T>(result: QueryResultLike<T>): RequestState<T, ClientError> {
  // A cancelled request isn't a failure to show the user: a new request is about to replace it.
  if (result.isError && isAbortError(result.error)) return { status: "loading" };
  if (result.isError) return { status: "error", error: toClientError(result.error) };
  if (result.currentData !== undefined) return { status: "success", data: result.currentData };
  if (result.isUninitialized) return { status: "idle" };
  return { status: "loading" };
}
