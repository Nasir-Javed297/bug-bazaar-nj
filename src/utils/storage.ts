// The ONE place that reads and writes localStorage safely. Used by:
// - useLocalStorage (React state synced with storage, src/hooks/useLocalStorage.ts)
// - the mock API's error switches (src/mocks/scenarios.ts)
// - the cart, which survives a reload (task D3-2)
//
// localStorage can throw (private mode, storage full, blocked by settings) and can contain
// anything (old versions of our data, edits made in DevTools), so every read is validated.

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
): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : undefined;
  } catch {
    return undefined; // storage unavailable or invalid JSON
  }
}

/** Saves a value as JSON. Fails silently: the app still works, it just won't remember. */
export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // storage unavailable
  }
}

/** Small type guard reused by validators: a plain object (not null, not an array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
