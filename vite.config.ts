// vitest/config's defineConfig = Vite's, plus the `test` section below.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Where the site is served from. "/" locally; the GitHub Pages deploy (bonus, D4-6) builds with
  // BASE_PATH=/<repository name>/ (e.g. /bug-bazaar/) because Pages serves the site under it.
  // Vite exposes it to the app as import.meta.env.BASE_URL.
  base: process.env.BASE_PATH ?? "/",
  optimizeDeps: {
    // MSW is loaded with a dynamic import() (src/main.tsx), so Vite would only discover it after
    // the page starts, then re-bundle and force a full page reload. Listing it here pre-bundles it
    // when the dev server starts instead.
    include: ["msw", "msw/browser"],
  },
  // ---------- Tests (task D4-5): `npm test` ----------
  test: {
    // A simulated browser (DOM, localStorage, events) inside Node.
    environment: "jsdom",
    // Starts the MSW mock server, adds jest-dom matchers, cleans up between tests.
    // setupEnvironment.ts must run first: it fixes jsdom/Node differences before any app module loads.
    setupFiles: ["./src/test/setupEnvironment.ts", "./src/test/setup.ts"],
    env: {
      // Node's fetch needs absolute URLs (a browser would fill in the domain).
      VITE_API_BASE_URL: "http://localhost/api",
      // No Dev panel in tests. MSW still runs: setup.ts starts it with the same handlers.
      VITE_ENABLE_MOCKS: "false",
    },
  },
});
