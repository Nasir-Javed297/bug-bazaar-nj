// Runs before every test file (vite.config.ts -> test.setupFiles).
import "@testing-library/jest-dom/vitest"; // readable matchers: toBeInTheDocument, toHaveTextContent...
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { handlers } from "../mocks/handlers";

// The SAME request handlers as the browser mock (task D1-2), running in Node. The app's real
// fetch calls go through them, so tests exercise the real data layer, not a fake API module.
export const server = setupServer(...handlers);

/**
 * `fetch` is Node's but `AbortController` is jsdom's, and Node rejects a signal that isn't its own
 * class ("Expected signal to be an instance of AbortSignal"). In a real browser both come from the
 * same place, so this is a test-only mismatch. Shim: don't pass the signal on; reject with an
 * AbortError when it fires. For the app (src/api/client.ts), cancelling behaves as in a browser.
 * Applied AFTER server.listen(): MSW wraps fetch too, and the outermost wrapper runs first.
 */
function acceptJsdomAbortSignals(): void {
  const innerFetch = globalThis.fetch;
  globalThis.fetch = (input, init = {}) => {
    const { signal, ...rest } = init;
    if (!signal) return innerFetch(input, rest);
    const abortError = () => new DOMException("The operation was aborted.", "AbortError");
    if (signal.aborted) return Promise.reject(abortError());
    return new Promise<Response>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(abortError()), { once: true });
      innerFetch(input, rest).then(resolve, reject);
    });
  };
}

beforeAll(() => {
  // Fail the test if the app calls an endpoint we don't mock: nothing reaches the real network.
  server.listen({ onUnhandledRequest: "error" });
  acceptJsdomAbortSignals();
  // jsdom doesn't implement these browser APIs; the app calls them, so give them harmless stand-ins.
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  cleanup(); // unmount whatever the test rendered (also stops polling timers)
  server.resetHandlers(); // undo any per-test handler overrides
  server.events.removeAllListeners(); // stop per-test request counters
  // window.* on purpose: Node 22+ has its OWN global localStorage, which shadows jsdom's.
  window.localStorage.clear(); // cart, mock switches, error log...
  window.sessionStorage.clear(); // session
});

afterAll(() => server.close());
