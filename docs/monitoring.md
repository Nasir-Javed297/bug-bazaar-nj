# Monitoring

How The Bug Bazaar catches unexpected errors today, and the three things I'd track in production.

## What happens when something breaks

| Kind of error                                  | Example                                      | Caught by                                        | What the user sees                                                                                                     | Logged as                              |
| ---------------------------------------------- | -------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Thrown while **rendering**                     | A component reads a field that's `undefined` | `ErrorBoundary` around the page area (`App.tsx`) | Fallback: "Something went wrong" + error reference + **Try again** / **Go to the home page**. The header keeps working | `render`, with the **component stack** |
| Thrown while rendering the header or providers | —                                            | Outer `ErrorBoundary` in `main.tsx`              | Same fallback, full page                                                                                               | `render`                               |
| Thrown in an **event handler**                 | A bug in an `onClick`                        | `window` `error` listener                        | Nothing changes on screen: React keeps running                                                                         | `window`                               |
| **Unhandled promise rejection**                | An `await` with no `try/catch`               | `window` `unhandledrejection` listener           | Nothing changes on screen                                                                                              | `promise`                              |
| **Expected** API errors (400/401/404/409/500)  | —                                            | Not here: handled as UI states (D3-4)            | Friendly messages, retry                                                                                               | —                                      |

- **Why two mechanisms:** error boundaries only catch errors thrown **while rendering**. Errors in event handlers, timers and promises happen outside rendering, so React can't show a fallback for them, but the global listeners still **log** them.
- **The reference id** (`err-k3x9`) is shown on the fallback, so a customer can quote it and support can find the exact entry (stack, component stack, page).
- **Raw error text is never shown,** only the reference (the same rule as D3-4).
- **Recovery:** the page-area boundary is keyed by the URL path, so navigating anywhere starts fresh. "Go to the home page" is a full page load, the safest reset.
- **No duplicates:** in development React reports some errors 2–3 times (extra `window` events for DevTools, plus one render retry). The logger skips an error identical to one logged in the last second, like Sentry's Dedupe integration. Verified: 1 error → 1 entry, in both the dev server and the production build.

**Where the log goes today:** `src/monitoring/logger.ts` writes to the console and keeps the last 20 entries in localStorage (viewable in 🛠 Dev tools → _Unexpected errors_). In production, `logError` is the one function to change: send the entry to an error-tracking service (Sentry, Datadog, …) instead.

**Try it:** 🛠 Dev tools → _Crash a page (render error)_, _Throw in an event handler_, _Unhandled promise rejection_.

## Three things I'd track in production

### 1. Unexpected error rate (crash-free sessions)

- **What:** the number of `render` / `window` / `promise` errors per 1,000 sessions, and the share of sessions with **no** crash. Grouped by error (message + location), page, browser and **release version**.
- **Why:** it's the direct measure of "is the app broken for people right now?". Grouping by release shows immediately whether a deploy caused it.
- **Alert when:** crash-free sessions drop below 99.5%, or a new error group appears right after a release.
- **How:** send `logError` entries to Sentry (with source maps uploaded at build time, so stack traces point at our TypeScript, not the minified bundle). Strip personal data: we already log the path without the query string, and never tokens or form values.

### 2. Checkout health (the money path)

- **What:** the funnel _cart → checkout → order placed_, plus the result of every `POST /api/orders`: 201, **409** (out of stock), 401 (session expired mid-checkout), 500 / network errors, and how often a **retry with the same idempotency key** returned an existing order.
- **Why:** this is where errors cost money. A spike in 409s means stock data is too stale (a caching problem, see D3-5). A spike in 500s means lost sales. Idempotent replays show how often users hit the "reply lost" case we protect against.
- **Alert when:** order success rate drops below its normal baseline, or 5xx on `/api/orders` exceeds 1% over 5 minutes.
- **How:** a tiny event after each checkout result (in `CheckoutPage`'s `try/catch`), plus server-side metrics.

### 3. Real-user performance (Core Web Vitals + API latency)

- **What:** **LCP** (how fast the main content appears), **INP** (how fast the page reacts to taps and typing, which matters for search and filters) and **CLS** (layout jumping), measured in real users' browsers, plus **p95 latency** of `GET /api/products` and `POST /api/orders`.
- **Why:** a store that is slow loses customers without throwing any error. These numbers catch regressions that error tracking can't see (for example a grid that became slow to render).
- **Alert when:** p75 LCP > 2.5 s, p75 INP > 200 ms, or p95 API latency doubles week over week.
- **How:** the `web-vitals` library reporting to the analytics/monitoring backend. Measured locally in `docs/performance.md` (D4-2).
