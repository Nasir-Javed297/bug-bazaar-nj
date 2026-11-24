// THE one place that decides what an API error means for the shopper (task D3-4).
// Every page and component turns a ClientError into a UserError here, so the same error
// always gets the same treatment and the same words.
//
// Raw messages from the server (error.message) are NEVER shown: they're technical, may leak
// internals, and aren't written for shoppers. Only the texts in this file reach the screen,
// plus 400 field messages (written for the form's fields, shown next to the matching field).
import type { ClientError } from "./client";

/**
 * What kind of problem it is, and what the UI should do about it:
 * - validation   (400) -> show field errors next to the fields
 * - unauthorized (401) -> the base query has already signed the user out; ask them to log in
 * - notFound     (404) -> show a Not Found page (retrying can't help)
 * - outOfStock   (409) -> name the item and say how many are left
 * - retryable    (500, network, anything else) -> offer "Try again"
 */
export type UserError =
  | { kind: "validation"; message: string; fieldErrors: Record<string, string> }
  | { kind: "unauthorized"; message: string }
  | { kind: "notFound"; message: string }
  | {
      kind: "outOfStock";
      message: string;
      productId: string | undefined;
      productName: string;
      available: number;
    }
  | { kind: "retryable"; message: string };

export function describeError(error: ClientError): UserError {
  switch (error.status) {
    case 400:
      return {
        kind: "validation",
        message: "Please check the highlighted fields.",
        fieldErrors: error.details ?? {},
      };

    case 401:
      return {
        kind: "unauthorized",
        // A wrong password and an expired session are both 401; the server's code tells them apart.
        message:
          error.code === "INVALID_CREDENTIALS"
            ? "Email or password is incorrect."
            : "Your session has expired. Please log in again.",
      };

    case 404:
      return { kind: "notFound", message: "We couldn't find what you were looking for." };

    case 409: {
      const productName = error.details?.productName ?? "One of the items";
      const parsed = Number(error.details?.available);
      const available = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
      return {
        kind: "outOfStock",
        productId: error.details?.productId,
        productName,
        available,
        message:
          available > 0
            ? `Sorry, only ${available} of "${productName}" ${available === 1 ? "is" : "are"} left.`
            : `Sorry, "${productName}" just sold out.`,
      };
    }

    case 0:
      return {
        kind: "retryable",
        message: "We couldn't reach the server. Check your internet connection and try again.",
      };

    default:
      // 500s, unexpected statuses, and responses we couldn't read.
      return {
        kind: "retryable",
        message: "Something went wrong on our side. Please try again in a moment.",
      };
  }
}
