// Turns a ClientError into words a shopper understands.
// Raw server/developer messages (error.message) are never shown on screen: they're for logs.
// (Task D3-4 extends this to form errors, 401, 404 and 409.)
import type { ClientError } from "./client";

export type ErrorDescription = {
  /** Short explanation of what went wrong, from the user's point of view. */
  message: string;
  /** Whether trying again might help (a 404 won't fix itself; a 500 might). */
  retryable: boolean;
};

export function describeError(error: ClientError): ErrorDescription {
  if (error.status === 0) {
    return {
      message: "We couldn't reach the server. Check your internet connection and try again.",
      retryable: true,
    };
  }
  if (error.status >= 500) {
    return {
      message: "Something went wrong on our side. Please try again in a moment.",
      retryable: true,
    };
  }
  if (error.status === 404) {
    return { message: "We couldn't find what you were looking for.", retryable: false };
  }
  return { message: "Something went wrong. Please try again.", retryable: true };
}
