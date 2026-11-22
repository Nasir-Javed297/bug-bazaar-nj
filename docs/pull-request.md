# The Bug Bazaar

A small online store for developer gear (rubber ducks, keyboards, coffee, stickers), built with **React 18 + TypeScript (strict)**, **Redux Toolkit + RTK Query** and a **mock API (MSW)** with 5,000 products. It started as the Week 1 Bug Bounty Board; the history is kept.

Every task has its own commit starting with its ID (`D1-1: …`), and every choice is recorded in [`docs/decisions.md`](docs/decisions.md).

## How to run it

```bash
npm install
npm run dev        # http://localhost:5173, the mock API starts automatically
npm run check      # typecheck + lint + format check + 37 tests
npm run a11y       # Lighthouse accessibility audit (home, cart, login)
```

- **Demo account:** `demo@bugbazaar.dev` / `password123`
- **🛠 Dev tools** (bottom-right): switches that force each error on purpose (server errors, expired session, sold out, slow or down network, out-of-order search, lost order reply, dropped stock feed) and a button that resets orders and stock.

## What's included

### Day 1: Foundations

- **D1-1 Setup:** Vite, ESLint (no `any`, no `@ts-ignore`, no `fetch` outside `src/api/`), Prettier, `.env.example`, a README you can follow in 5 minutes.
- **D1-2 API contract:** [`docs/api-contract.md`](docs/api-contract.md) with every endpoint, type and status code, implemented by MSW.
- **D1-3 TypeScript:** strict mode, the contract typed in `src/types/api.ts`, type guards for everything from outside, plus a [cheat sheet](docs/typescript-cheatsheet.md).
- **D1-4 Data layer:** one HTTP client (`client.ts`) that never throws, RTK Query endpoints, and one `RequestState` union for every page.

### Day 2: React

- **D2-1 Product list**, **D2-2 filters in the URL** (shareable, Back works, invalid values ignored), **D2-3 every UI state** (loading, error + retry, empty, 404), **D2-4 effect cleanup** (cancelled requests, removed listeners), **D2-5 custom hooks** (`useProductFilters`, `useDebouncedValue`, `useLocalStorage`), **D2-6 race conditions** (a slow reply for "d" can't replace the results for "duck").

### Day 3: State and the backend

- **D3-1 Redux Toolkit** cart, **D3-2 cart and checkout** (quantities ≤ stock, survives reload, idempotency key so a retry never creates a second order, order status polling), **D3-3 auth** (login, protected routes, redirect back, logout on 401, [`docs/auth.md`](docs/auth.md)), **D3-4 backend errors** mapped to messages a shopper understands, **D3-5 caching** with tags.

### Day 4: Quality

- **D4-1 Accessibility:** Lighthouse **100** on home, cart and login; skip link, focus management, live regions.
- **D4-2 / D4-3 Performance:** the 5,000-product view went from **1,225 ms to ~84 ms** after the response and from **33 to 60 fps** scrolling (virtualization + `React.memo`), every optimization measured ([`docs/performance.md`](docs/performance.md)).
- **D4-4 WebSockets:** live stock updates, reconnect with exponential backoff + jitter, closed when the page closes.
- **D4-5 Testing:** 37 tests (Vitest + Testing Library + MSW), tested like a shopper uses the app.
- **D4-6 CI:** GitHub Actions runs typecheck → lint → format → tests → build; branch protection makes it required.
- **D4-7 Monitoring:** error boundaries, an error log with reference ids, [`docs/monitoring.md`](docs/monitoring.md).

### Day 5: Architecture and reflection

- **D5-1 / D5-2** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): structure, data-flow diagrams, where state lives, three design patterns.
- **D5-3** [`docs/orders.md`](docs/orders.md): order queue design, email outages, how idempotency prevents double charges.
- **D5-4** [`docs/glossary.md`](docs/glossary.md), **D5-5 / D5-6** partner reviews in [`docs/reviews/`](docs/reviews/), **D5-7** [`docs/ai-notes.md`](docs/ai-notes.md), **D5-8** [`docs/reflection.md`](docs/reflection.md).

## How to check the important behaviour

| Try this                                                                                                          | Expected                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Filter, then copy the URL into a new tab                                                                          | Same filtered list                                                |
| Search "duck" with Dev tools → _Out-of-order search_ on                                                           | Results for "duck", never for "d"                                 |
| Dev tools → _Product list fails (500)_, refresh, switch it off, then **Try again**                                | Friendly error, then the list                                     |
| Open `/checkout` logged out                                                                                       | Login, then back to checkout with the cart intact                 |
| Dev tools → _Checkout: order saved, reply lost (500)_, place an order, switch it off, click **Place order** again | One order, not two (same idempotency key)                         |
| Dev tools → _Checkout: item sold out (409)_, place an order                                                       | "Sorry, "X" just sold out." and the item is removed from the cart |
| Log in, Dev tools → _Session expired_, open Account                                                               | Logged out with "Your session has expired"                        |
| Product page with Dev tools → _Live stock: drop connections_                                                      | "Live stock paused, reconnecting…", recovers when switched off    |
| Show **All** products and scroll                                                                                  | Smooth; only visible rows are in the DOM                          |

## Checks

- [x] CI green (typecheck, lint, format, 37 tests, build)
- [x] Lighthouse accessibility 100 on home, cart and login
- [x] Every task has a commit with its ID, and a decision in `docs/decisions.md`
- [x] README: setup in under 5 minutes, scripts, env vars, mock API, docs list

## Known limitations

- **Mock backend only.** MSW runs in the browser; the API contract is ready for a real server (`VITE_ENABLE_MOCKS=false`, `VITE_API_BASE_URL`).
- **Token in `sessionStorage`:** survives a refresh but is readable by any script on the page (XSS). An httpOnly cookie would be safer and needs a real backend ([`docs/auth.md`](docs/auth.md)).
- The `React.memo` gain wasn't measured on a real phone, only a desktop.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
