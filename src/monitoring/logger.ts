// Where unexpected errors go (task D4-7). Every source funnels into logError():
//   "render"  - a component threw while rendering (caught by an ErrorBoundary)
//   "window"  - an error nobody caught: event handlers, timers, code outside React
//   "promise" - a rejected promise nobody handled
//
// In production this would send each entry to an error-tracking service (Sentry, Datadog...).
// The mock store has no such server, so entries go to the console and the last 20 are kept in
// localStorage (visible in the Dev panel), where they survive the reload that follows a crash.
import { isRecord, readStorage, removeStorage, writeStorage } from "../utils/storage";

export type ErrorSource = "render" | "window" | "promise";

export type LoggedError = {
  /** Short reference shown on the fallback screen, so a user can quote it to support. */
  id: string;
  time: string;
  source: ErrorSource;
  message: string;
  stack?: string;
  /** For render errors: which components were rendering (from React). */
  componentStack?: string;
  /** Path only: no query string, which could contain personal data. */
  path: string;
};

const STORAGE_KEY = "bug-bazaar:error-log";
const MAX_ENTRIES = 20;
const MAX_STACK_LENGTH = 2000;
/** Fired after each new entry, so the Dev panel can update live. */
export const ERROR_LOGGED_EVENT = "bug-bazaar:error-logged";

function isLoggedError(value: unknown): value is LoggedError {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.time === "string" &&
    typeof value.message === "string" &&
    (value.source === "render" || value.source === "window" || value.source === "promise")
  );
}

const isErrorLog = (value: unknown): value is LoggedError[] =>
  Array.isArray(value) && value.every(isLoggedError);

export function readErrorLog(): LoggedError[] {
  return readStorage(STORAGE_KEY, isErrorLog) ?? [];
}

export function clearErrorLog(): void {
  removeStorage(STORAGE_KEY);
  window.dispatchEvent(new Event(ERROR_LOGGED_EVENT));
}

// Anything can be thrown (`throw "oops"`), not only Error objects.
const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/** Same message + same code location = the same error. */
const errorKey = (err: Error): string => `${err.message}|${err.stack?.split("\n")[1] ?? ""}`;

/** When each error was last logged, to skip duplicates reported via `window` (below). */
const recentErrors = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 1000;

/** Records an error and returns the entry (its `id` is the reference shown to the user). */
export function logError(
  error: unknown,
  source: ErrorSource,
  extra: { componentStack?: string } = {},
): LoggedError {
  const err = toError(error);
  recentErrors.set(errorKey(err), Date.now());

  const entry: LoggedError = {
    id: `err-${Math.random().toString(36).slice(2, 7)}`,
    time: new Date().toISOString(),
    source,
    message: err.message,
    stack: err.stack?.slice(0, MAX_STACK_LENGTH),
    componentStack: extra.componentStack?.slice(0, MAX_STACK_LENGTH),
    path: window.location.pathname,
  };

  console.error(`[monitoring] ${source} error ${entry.id}:`, err);
  writeStorage(STORAGE_KEY, [entry, ...readErrorLog()].slice(0, MAX_ENTRIES));
  window.dispatchEvent(new Event(ERROR_LOGGED_EVENT));
  return entry;
}

/**
 * Error boundaries only catch errors thrown while RENDERING. These two listeners catch the rest
 * (event handlers, timers, promises), so they're at least logged. Called once, in main.tsx.
 */
export function installGlobalErrorHandlers(): void {
  window.addEventListener("error", (event) => {
    const err = toError(event.error ?? event.message);
    // In DEVELOPMENT, React also reports errors from rendering and from event handlers through
    // extra window "error" events (so DevTools can pause on them), and retries a failed render
    // once, so one error can arrive here 2-3 times. Wait one tick, then skip it if the same
    // error was logged in the last second (e.g. by an error boundary, whose entry has the
    // component stack and the user's reference). Error trackers like Sentry dedupe the same way.
    window.setTimeout(() => {
      const loggedAt = recentErrors.get(errorKey(err));
      if (loggedAt !== undefined && Date.now() - loggedAt < DUPLICATE_WINDOW_MS) return;
      logError(err, "window");
    }, 0);
  });
  window.addEventListener("unhandledrejection", (event) => {
    logError(event.reason, "promise");
  });
}
