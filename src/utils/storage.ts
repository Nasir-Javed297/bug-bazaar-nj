// The ONE place that reads and writes browser storage safely. Used by:
// - useLocalStorage (React state synced with storage, src/hooks/useLocalStorage.ts)
// - the mock API's error switches (src/mocks/scenarios.ts)
// - the cart, which survives a reload (src/store/cartPersistence.ts, localStorage)
// - the login session (src/store/authPersistence.ts, sessionStorage; see docs/auth.md)
//
// Storage can throw (private mode, storage full, blocked by settings) and can contain
// anything (old versions of our data, edits made in DevTools), so every read is validated.

/** "local" = localStorage (kept until removed), "session" = sessionStorage (until the tab closes). */
export type StorageArea = "local" | "session";

// Resolved inside try blocks: even READING window.localStorage can throw when storage is blocked.
const getStorage = (area: StorageArea): Storage =>
  area === "session" ? window.sessionStorage : window.localStorage;

/**
 * Reads and parses a JSON value. Returns undefined if it's missing, unreadable,
 * or doesn't pass `isValid`, so callers fall back to their default.
 *
 * `isValid` is a type guard: `(value: unknown) => value is T`. If it returns true,
 * TypeScript treats the value as a T from then on.
 */
export function readStorage<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  area: StorageArea = "local",
): T | undefined {
  try {
    const raw = getStorage(area).getItem(key);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : undefined;
  } catch {
    return undefined; // storage unavailable or invalid JSON
  }
}

/** Saves a value as JSON. Fails silently: the app still works, it just won't remember. */
export function writeStorage(key: string, value: unknown, area: StorageArea = "local"): void {
  try {
    getStorage(area).setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export function removeStorage(key: string, area: StorageArea = "local"): void {
  try {
    getStorage(area).removeItem(key);
  } catch {
    // storage unavailable
  }
}

/** Small type guard reused by validators: a plain object (not null, not an array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
