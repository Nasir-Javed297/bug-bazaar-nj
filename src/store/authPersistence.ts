// Keeps the session in sessionStorage, so a page refresh doesn't log you out, but closing the
// tab does. The trade-offs of this choice are explained in docs/auth.md.
import { isRecord, readStorage } from "../utils/storage";
import type { AuthState, Session } from "./authSlice";

export const SESSION_STORAGE_KEY = "bug-bazaar:session";

function isSession(value: unknown): value is Session {
  return (
    isRecord(value) &&
    typeof value.token === "string" &&
    isRecord(value.user) &&
    typeof value.user.id === "string" &&
    typeof value.user.name === "string" &&
    typeof value.user.email === "string"
  );
}

/** The auth state to start with: the saved session if it's valid, otherwise logged out. */
export function loadAuth(): AuthState {
  return {
    session: readStorage(SESSION_STORAGE_KEY, isSession, "session") ?? null,
    logoutReason: null,
  };
}
