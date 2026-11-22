// Reads `{ from: "/somewhere" }` from React Router's navigation state.
// Used for "Back to products" (ProductDetailsPage) and "return to where you were" after login.
import { isRecord } from "./storage";

/**
 * Returns the path to go back to, or undefined. Navigation state can be anything (or missing,
 * e.g. after opening a shared link), so it's validated:
 * - must be a path inside this site ("/checkout"), not a full URL;
 * - "//evil.com" is rejected: browsers treat it as another website (an "open redirect").
 */
export function getFromPath(state: unknown): string | undefined {
  if (!isRecord(state) || typeof state.from !== "string") return undefined;
  const from = state.from;
  return from.startsWith("/") && !from.startsWith("//") ? from : undefined;
}
