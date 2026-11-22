// Switches that make the mock API fail on purpose, so every error state can be tested.
// Saved in localStorage so they survive a page refresh. Flipped from the Dev panel.

export type MockScenarios = {
  /** GET /api/products responds 500. */
  failProductList: boolean;
  /** Every endpoint responds 500 (simulated outage, e.g. for the details page retry). */
  serverOutage: boolean;
  /** Every request that needs a login responds 401, as if the token expired. */
  expireSession: boolean;
  /** POST /api/orders responds 409 for the first item, as if someone bought it first. */
  forceOutOfStock: boolean;
  /** Adds 2-4 seconds of latency to every response, to see loading states. */
  slowNetwork: boolean;
};

export const DEFAULT_SCENARIOS: MockScenarios = {
  failProductList: false,
  serverOutage: false,
  expireSession: false,
  forceOutOfStock: false,
  slowNetwork: false,
};

export const SCENARIO_LABELS: Record<keyof MockScenarios, string> = {
  failProductList: "Product list fails (500)",
  serverOutage: "Server outage: every endpoint fails (500)",
  expireSession: "Session expired (401 on login-only endpoints)",
  forceOutOfStock: "Checkout: item sold out (409)",
  slowNetwork: "Slow network (+2-4 s)",
};

const STORAGE_KEY = "bug-bazaar:mock-scenarios";

export function getScenarios(): MockScenarios {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const result = { ...DEFAULT_SCENARIOS };
    if (typeof parsed === "object" && parsed !== null) {
      // Only copy keys we know, and only boolean values: never trust stored data blindly.
      for (const key of Object.keys(DEFAULT_SCENARIOS) as (keyof MockScenarios)[]) {
        const value: unknown = (parsed as Record<string, unknown>)[key];
        if (typeof value === "boolean") result[key] = value;
      }
    }
    return result;
  } catch {
    return { ...DEFAULT_SCENARIOS };
  }
}

/**
 * Where db.ts saves orders and stock changes. Defined here (not in db.ts) so the Dev panel
 * can reset the database without importing db.ts, which would pull all 5,000 products
 * into the main bundle.
 */
export const MOCK_DB_STORAGE_KEY = "bug-bazaar:mock-db";

/** Clears saved orders and stock changes. Takes effect on the next page load. */
export function resetMockDatabase(): void {
  try {
    localStorage.removeItem(MOCK_DB_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to reset.
  }
}

export function setScenarios(scenarios: MockScenarios): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    // Storage unavailable: switches simply won't persist.
  }
}
