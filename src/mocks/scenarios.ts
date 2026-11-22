// Switches that make the mock API fail on purpose, so every error state can be tested.
// Saved in localStorage so they survive a page refresh. Flipped from the Dev panel.
import { isRecord, readStorage, removeStorage } from "../utils/storage";

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

export const SCENARIOS_STORAGE_KEY = "bug-bazaar:mock-scenarios";

const SCENARIO_KEYS = Object.keys(DEFAULT_SCENARIOS) as (keyof MockScenarios)[];

/** Type guard: a stored value is valid only if every switch is a boolean. */
export function isMockScenarios(value: unknown): value is MockScenarios {
  return isRecord(value) && SCENARIO_KEYS.every((key) => typeof value[key] === "boolean");
}

/** Read by the mock handlers on every request, so a switch applies to the next request. */
export function getScenarios(): MockScenarios {
  return readStorage(SCENARIOS_STORAGE_KEY, isMockScenarios) ?? DEFAULT_SCENARIOS;
}

/**
 * Where db.ts saves orders and stock changes. Defined here (not in db.ts) so the Dev panel
 * can reset the database without importing db.ts, which would pull all 5,000 products
 * into the main bundle.
 */
export const MOCK_DB_STORAGE_KEY = "bug-bazaar:mock-db";

/** Clears saved orders and stock changes. Takes effect on the next page load. */
export function resetMockDatabase(): void {
  removeStorage(MOCK_DB_STORAGE_KEY);
}
