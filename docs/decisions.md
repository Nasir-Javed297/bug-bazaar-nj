# Decisions

For each task: what I used, what else I considered, and why.

## D1-3: TypeScript

**Used:** TypeScript 5.6 with `strict: true`, plus `noUncheckedIndexedAccess`, `noUnusedLocals` and `noUnusedParameters`. A `npm run typecheck` script (`tsc --noEmit`) and `npm run build` runs it before bundling, so broken types can't ship.

**How the contract is typed:** `src/types/api.ts` holds one type per shape in the shared contract (`Product`, `ApiError`, `ProductsResponse`, `User`, `Order`, ...). The mock server, the data layer and the components all import from this one file.

**How impossible states are prevented:** `src/types/request.ts` defines `RequestState<T>` as a discriminated union:

```ts
| { status: "idle" } | { status: "loading" }
| { status: "success"; data: T } | { status: "error"; error: E }
```

Before, the app had three separate `useState` calls (`loading`, `error`, `bugs`). Nothing stopped `loading: true` and `error: "..."` at the same time. With the union, only one variant exists at a time, and TypeScript won't let a component read `data` without first checking `status === "success"`.

**Considered:**

- _Keeping JavaScript with JSDoc types._ Rejected: TypeScript is a fixed requirement, and JSDoc checks are weaker and easy to skip.
- _Loose mode first, strict later._ Rejected: the codebase is small, so going straight to strict was cheap. Turning it on later always costs more.
- _Boolean flags (`isLoading`, `isError`)._ Rejected for the reason above: they allow impossible combinations.

**Rule:** no `any` and no `@ts-ignore`. When TypeScript doesn't know a type (for example `catch (err)`), we narrow `unknown` with checks like `err instanceof Error`.

## D1-1: Setup

**Used:**

- **ESLint 9** (flat config) with `typescript-eslint`, `react-hooks` and `react-refresh`. It finds real bugs (missing effect dependencies, hooks called conditionally) and enforces the TypeScript rules: no `any`, no `@ts-ignore` / `@ts-expect-error`, `import type` for types.
- **Prettier** for formatting, plus `eslint-config-prettier` so ESLint never reports formatting. Each tool does one job.
- **`.editorconfig`, `.gitattributes`, `.vscode/`**: the same indentation and LF line endings on every OS and editor, plus format-on-save in VS Code.
- **Environment variables**: listed in `.env.example`, typed in `src/vite-env.d.ts`, and read in one place (`src/config.ts`) with defaults. The app runs without a `.env` file, which keeps setup under 5 minutes.
- **A layered folder structure** (`api/`, `mocks/`, `store/`, `pages/`, `components/`, `hooks/`, `types/`, `utils/`). Each folder holds one kind of code, so it's obvious where a new file goes.
- `npm run check` runs typecheck + lint + format check in one command. CI will reuse it (D4-6).

**Considered:**

- _Biome_ (one fast tool for lint + format). Rejected: smaller plugin ecosystem, with no official React Hooks rules equivalent to `eslint-plugin-react-hooks`.
- _ESLint only, with its formatting rules._ Rejected: those rules are deprecated, and Prettier is the standard.
- _Feature folders_ (`features/cart/` holding that feature's slice, components and pages). A good fit for bigger apps. For a store this size, the layered structure is simpler to navigate and explain.
- _Husky pre-commit hooks._ Skipped: CI (D4-6) enforces the same checks on every pull request without slowing down each local commit.

## D1-2: HTTP and API contracts

**Used:** **MSW (Mock Service Worker)** v2. A service worker intercepts `fetch` in the browser and answers from `src/mocks/handlers.ts` with real HTTP status codes and JSON bodies. The contract is documented in `docs/api-contract.md` and typed in `src/types/api.ts`.

- **Data:** 5,000 products generated from a fixed seed (`src/mocks/seed.ts`), so ids and stock are the same on every load and in tests.
- **Logic separate from HTTP:** `db.ts` holds the "server" rules (search, sort, stock, orders, tokens). `handlers.ts` only turns results into status codes. The checks run in the same order as a real server: outage → 401 → 400 → 404/409 → success.
- **Triggering errors:** natural triggers where possible (wrong password → 401, unknown id → 404, too many → 409), plus Dev panel switches stored in `localStorage` for the rest (500, forced 409, expired session, slow network).
- **Persistence:** orders and stock changes are saved in `localStorage`, so an order confirmation page still works after a refresh.
- **Idempotency** is enforced on the server side, through the `Idempotency-Key` header (used by checkout in D3-2).

**Considered:**

- _A hand-written fake `fetch` / fake API module._ Simpler, but it skips real HTTP: no status codes, nothing in the Network tab, and app code that differs from production.
- _json-server or a small Express server._ Real HTTP, but it's a second process to run and harder to reset per test. It would also push setup past the 5-minute goal.
- _MSW_ was chosen because the app code is identical to what it would be with a real backend (only `VITE_ENABLE_MOCKS` changes), and the same handlers run in the Vitest tests (D4-5) through `msw/node`.

**Trade-offs:** the 5,000 products are generated in the browser (~1 ms). The mock code only loads when mocks are on (dynamic `import()`). Tokens are base64, not signed, which is fine for a mock but must never be done in a real system.

## D1-4: Data layer

**Used:** two layers, and components only ever talk to the top one.

1. **`src/api/client.ts`** is the only code that calls `fetch`. It builds the URL from `config.apiBaseUrl`, sets JSON and auth headers, passes an `AbortSignal`, parses JSON, and turns every failure (4xx/5xx, offline, aborted) into one `ClientError` shape. It returns a result union (`{ ok: true, data } | { ok: false, error }`) instead of throwing, so callers can't forget the error case.
2. **RTK Query** (`src/api/apiSlice.ts`) declares the endpoints once and generates hooks (`useGetProductsQuery`). Its base query just calls `apiRequest`, so every request still goes through the client.
3. **`src/api/requestState.ts`** is an adapter that converts RTK Query's booleans (`isLoading`, `isError`...) into our `RequestState` union, so components handle every state with one `switch`. It reads `currentData`, not `data`, so a component never shows results that belong to an older argument (protects D2-4 and D2-6).

**Enforced, not just promised:** ESLint's `no-restricted-globals` / `no-restricted-properties` make `fetch`, `window.fetch` and `XMLHttpRequest` errors everywhere outside `src/api/` and `src/mocks/`.

**Considered:**

- _A plain `fetch` wrapper plus our own `useApi` hook._ Simple, but we'd have to build caching, de-duplication and cache invalidation ourselves (D3-5).
- _TanStack Query._ Excellent, but D3-1 already needs Redux Toolkit, and RTK Query gives the same features inside the same store and devtools.
- _axios._ Adds interceptors, but `fetch` plus a 100-line wrapper covers our needs without a dependency.
- _Runtime validation of responses (zod)._ The client trusts that a 2xx body matches the contract (`body as T`). Validating with a schema would catch a backend that breaks the contract. Worth adding with a real backend; skipped for a mock we control.

**Debugging note (the stuck "Loading..." bug):** while testing, the page sometimes stayed on "Loading..." even though the store showed `rejected`. Dispatching a no-op action made the error appear, which proved the state was right and only the re-render notification was delayed. The cause: Redux Toolkit 2's `configureStore` adds an auto-batch enhancer that delivers RTK Query notifications on `requestAnimationFrame`, and browsers pause `requestAnimationFrame` in hidden tabs. My test browser pane was hidden. In a visible tab the update arrives on the next frame, so we kept the default (it saves re-renders). Tests in jsdom (D4-5) must account for it.

## D2-1: Product list

**Used:**

- **`formatPrice(cents)`** (`src/utils/formatPrice.ts`) is the only place cents become text. It uses one shared `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`, which always shows 2 decimals and thousands separators (`124900` → `$1,249.00`). Prices stay integers everywhere else, because floating point can't represent most decimals exactly (`0.1 + 0.2 === 0.30000000000000004`).
- **Small components, one job each:** `ProductGrid` (layout), `ProductCard` (one product), `StockBadge` (stock text, shared by card and details page). Pages are **containers** that fetch data and pick the state. Components are **presentational**: props in, UI out.
- **Keyboard support through semantic HTML:** the product name is a real `<Link>` and the **only** focusable element in each card. A CSS "stretched link" (`::after` with `inset: 0`) makes the whole card clickable for mouse users. Keyboard users get exactly one Tab stop per product, Enter opens it, and `:focus-within` outlines the whole card. The grid is a `<ul>`, so screen readers announce the item count.
- **Details page** reads `:id` with `useParams` and uses `skipToken` when there's no id. A 404 shows a Not Found screen (retrying wouldn't help). Other errors show Try again.
- **Responsive grid** with `repeat(auto-fill, minmax(220px, 1fr))`: from 1 column on a phone to 5 on a wide screen, with no media queries.

**Considered:**

- _Making the whole card a `<Link>`._ Simple, but the D3-2 "Add to cart" button couldn't go inside it (interactive elements can't be nested), and screen readers would read the entire card as one long link name.
- _Arrow-key navigation (roving `tabindex`)._ Useful for app-like widgets, but a product grid is a list of links, and users expect Tab to work. One Tab stop per card keeps it short.
- _A `formatPrice` that divides with `toFixed(2)`._ Works for dollars, but has no currency symbol or thousands separator, and isn't locale-aware.

## D2-2: Filters

**Used:** **the URL is the only place filters live.** `useProductFilters` (`src/hooks/useProductFilters.ts`) reads them with React Router's `useSearchParams`, validates them, and writes changes back to the URL. There's no `useState` copy, so nothing can drift out of sync.

- **Refresh / shared link:** the full view (`?search=debug&category=ducks&inStock=true&sort=price-asc&page=2`) is in the address bar, so reloading or pasting the link rebuilds exactly the same view.
- **Back button:** every category / sort / in-stock / page change **pushes** a history entry. While typing a search, the first keystroke pushes and the rest **replace**, so typing "duck" is one Back step, not four. (The first version replaced on every keystroke, which overwrote the previous view in history. Testing Back caught it.)
- **Validation:** `parseFilters` treats the URL as untrusted input. Unknown categories, unknown sorts, and pages that aren't positive whole numbers fall back to defaults. `?page=999` shows "This page doesn't exist" with a link to page 1.
- **Short, canonical URLs:** `filtersToParams` leaves out default values, so the same view always has the same URL.
- **Changing a filter resets to page 1**, because page 7 of the old results may not exist in the new ones.
- **Back to products** on the details page returns to the same filtered list: the card passes `{ from: "/?..." }` as router state. Opened from a shared link, the state is missing and the link falls back to `/`.
- **Result count** is in a `role="status"` element, so screen readers announce it when it changes.

**Considered:**

- _Filters in `useState`._ Fails all three criteria: lost on refresh, not in the link, invisible to the Back button.
- _Filters in Redux._ Survives navigation but not refresh, and isn't shareable. It would also be a second copy of what the URL already says.
- _Filtering the 5,000 products in the browser._ Fast enough, but the contract defines server-side `search/category/sort/page`, and that's how a real catalogue scales.
- _`navigate(-1)` for "Back to products"._ Breaks when the page was opened from a shared link (it would leave the site). Router state with a `/` fallback handles both cases.

## D2-3: UI states

**Used:** one set of state views, so consistency doesn't depend on remembering to copy markup.

- **`LoadingState`, `ErrorState`, `EmptyState`** (`src/components/StatusViews.tsx`) are the only loading/error/empty markup in the app. Loading uses `role="status"`, and errors use `role="alert"` so screen readers announce them immediately. The spinner switches to a gentle pulse when the OS asks for reduced motion.
- **`QueryStateView`** (`src/components/QueryStateView.tsx`) takes a `RequestState` and picks the view. Pages only pass labels, an optional `isEmpty` check, and a **render prop** (`children: (data) => ReactNode`) that's called only when data exists, already typed.
- **`describeError`** (`src/api/errorMessages.ts`) turns a `ClientError` into friendly text and decides whether retrying makes sense. Raw messages from the server never reach the screen.
- **Retry** calls RTK Query's `refetch()`. While it runs, the adapter reports `loading`, so the user sees the same loading view, then success or the error again.
- **404 on the details page** shows the Not Found page instead of an error, because retrying can't make a missing product appear.

**How to trigger each state** (🛠 Dev tools, bottom-right):

| State   | Product list                                      | Product details                   |
| ------- | ------------------------------------------------- | --------------------------------- |
| Loading | **Slow network** (+2-4 s)                         | **Slow network**                  |
| Error   | **Product list fails (500)** or **Server outage** | **Server outage**                 |
| Retry   | Turn the switch off, click **Try again**          | Same                              |
| Empty   | Search for `zzzz`, or open `/?page=999`           | (n/a: a missing product is a 404) |
| 404     | (n/a)                                             | Open `/products/nope`             |
| Success | All switches off                                  | All switches off                  |

**Considered:**

- _A `switch` in every page._ That's what the pages had before. It works, but each page drifted (different text, roles and markup), which is exactly what "consistent" rules out.
- _React Suspense + error boundaries for data loading._ Elegant, but RTK Query's hooks don't suspend by default, and an error boundary is meant for unexpected crashes (D4-7), not expected API errors with a retry.
- _Skeleton cards instead of a spinner for the list._ Nicer perceived performance, but a different look per page. Kept one loading style for consistency.

## D2-4: useEffect and cleanup

**Used:**

- **Never the wrong product:** pages read RTK Query's `currentData`, which only holds data for the **current** id (D1-4). A slow response for a product you already left can't be shown.
- **Cancelling in-flight requests:** `useCancelProductRequestOnLeave(id)` has a cleanup that aborts the product's still-running request (`api.util.getRunningQueryThunk(...).abort()`) when the id changes or the page closes. The abort reaches `fetch` through the `AbortSignal` that `client.ts` passes along, so the browser really stops the request (`ERR_ABORTED` in the Network tab).
- **StrictMode-safe:** in development React runs effects _set up → clean up → set up_ to catch missing cleanups. The cleanup therefore schedules the abort for the next tick, and a re-run for the **same** id un-schedules it. Without that, dev mode would cancel the request the page is about to use.
- **Cancelled ≠ failed:** the adapter (`requestState.ts`) reports an aborted request as `loading`, so returning to a product whose request was cancelled never flashes an error.
- **Back to Top** (`BackToTopButton`): a `scroll` listener (`passive: true`) that schedules at most one state update per frame with `requestAnimationFrame`. The cleanup removes the listener **and** cancels any pending frame. Clicking it respects `prefers-reduced-motion` and moves focus to `<main>`, because the button disappears.
- **Scroll reset** when the product id changes (`useEffect(..., [id])`), because React Router keeps the scroll position between routes.
- **"More from this category"** on the details page gives a realistic way to switch products quickly, and makes the page long enough for Back to Top.

**Verified:** with Slow network on (responses arrive out of order), switching p-0101 → p-0202 → p-0303 150 ms apart showed p-0303, and the first two requests were `ERR_ABORTED`. Leaving a loading product cancelled its request. Wrapping `add/removeEventListener` showed 2 scroll listeners added and 2 removed after leaving the page (StrictMode adds one extra and removes it).

**Considered:**

- _Only relying on `currentData`._ Correct display, but the old request keeps running. The task asks for cleanup of in-flight requests.
- _Our own `useEffect` + `AbortController` + `fetch` for the details page._ The classic pattern, but it would bypass the cache (D3-5) and duplicate what RTK Query already does. We use RTK Query's own abort, which uses an `AbortController` internally.
- _Aborting immediately in the cleanup._ Breaks in StrictMode (described above).
- _Throttling scroll with `setTimeout`._ `requestAnimationFrame` matches the screen refresh rate and is paused in background tabs, so it's cheaper and smoother.

## D2-5: Custom hooks

**Used:** two generic, typed hooks that know nothing about products, built on one shared helper module.

| Hook                                        | What it does                                                                                         | Used by                                         | Duplication it removes                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `useLocalStorage<T>(key, default, isValid)` | `useState` that's saved to localStorage, validated on read, and synced across tabs (`storage` event) | Dev panel (and the "remember me" pattern later) | The Dev panel kept `useState` and storage in sync by hand. `scenarios.ts` had its own read/parse/validate/try-catch code |
| `useDebouncedValue<T>(value, ms)`           | Returns the value once it has stopped changing for `ms`                                              | Product search (300 ms)                         | Timer + cleanup logic that would otherwise be rewritten for every debounced input                                        |

- **`src/utils/storage.ts`** (`readStorage`, `writeStorage`, `removeStorage`, `isRecord`) is the single copy of the safe localStorage logic. It's plain functions, not hooks, because the mock API (`scenarios.ts`) and the cart persistence (D3-2) run outside React components.
- **Validation by type guard:** `readStorage<T>(key, isValid)` only returns a `T` if `isValid` says so. Corrupt or old data falls back to the default instead of crashing.
- **Debounce effect:** the search box and URL still update on every keystroke (instant feedback, and Back still works). Only the request waits. Typing "keyboard" sends **1** request instead of 8.
- Other custom hooks in the app: `useProductFilters` (URL ↔ typed filters, D2-2) and `useCancelProductRequestOnLeave` (D2-4).

**Verified:** typing "keyboard" quickly → one `search=keyboard` request. A Dev panel switch toggled in one tab updated another tab without a reload. Corrupt JSON in storage → defaults, and storage repaired.

**Considered:**

- _A `useDebouncedCallback` (debounce the function instead of the value)._ Useful for "save after typing", but a debounced **value** fits better as a query argument and needs no `useRef` juggling.
- _lodash.debounce / usehooks-ts._ Fine libraries, but each hook is under 25 lines, and writing them shows how the cleanup works.
- _Functional updates in `useLocalStorage` (`setValue(prev => ...)`)._ Left out to keep the API simple. The Dev panel computes the next value from the current one directly.

## D2-6: Race conditions

**The problem:** replies don't have to come back in the order requests were sent. With naive code (`fetch(...).then(data => setProducts(data))`), whichever reply arrives **last** wins, even if it's for an older query.

**Simulation:** the Dev panel switch **Out-of-order search** makes the mock delay each search by `2600 ms − 600 ms × letters`, so "d" answers last (2.0 s) and "duck" first (0.2 s).

**Proof the bug is real:** a console script with naive "last response wins" logic sent `d, du, duc, duck` 350 ms apart. Replies arrived `duck, duc, du, d`, and the naive screen ended on **3,171 results for "d"** while the box said "duck" (correct: 1,278).

**How the store avoids it (layered):**

1. **Debounce (D2-5):** fast typing sends one request. This reduces the race but doesn't prevent it: a user who pauses longer than 300 ms between letters still sends several.
2. **Cache keyed by query + `currentData`:** RTK Query stores each reply under **its own** arguments, and our adapter reads `currentData`, the entry for the **current** arguments only. A late reply for "d" fills the "d" entry and can never replace "duck". The rule is "show the answer to the current question", not "show the last answer".
3. **No stale results while typing:** during the 300 ms debounce window the box already says "duck" while the last request was for "du". The page compares the box with the debounced query and shows "Searching…" until they match, so the result list and count always belong to the text in the box.

**Verified in the UI:** with the switch on, typing d / u / c / k with 350 ms pauses sent all four requests, and "d" answered last. A recorder sampled the screen every 100 ms: 47 samples, 28 showing results, **0 showing results for a different query than the box**. Final screen: 1,278 / p-0013 (duck).

**Considered:**

- _A "request id" check (`if (id !== latestId.current) return`) or an `ignore` flag in the effect cleanup._ The classic fix for hand-written `useEffect` fetching, and how I'd do it without RTK Query. Keying results by query solves the same problem, and also caches them.
- _Aborting older search requests._ That saves bandwidth, but the late replies are still useful: they're cached, so deleting back from "duck" to "du" shows results instantly. Correctness doesn't depend on aborting. (For product details we do abort, D2-4, because the task asked for cleanup there.)
- _Showing the previous results dimmed while searching._ Nicer for some users, but it would still show an old query's results and count, which this task rules out.

## D3-1: Redux Toolkit

**Used:** Redux Toolkit slices for the two kinds of shared **client** state:

- **`cartSlice`**: `{ items: CartItem[] }`. Reducers `itemAdded`, `quantityChanged`, `itemRemoved`, `cartCleared` are the **only** ways the cart changes. Action names describe what happened, and the reducer decides how state changes. The stock limit (`clampQuantity`) lives in the reducer, so no component can bypass it.
- **`authSlice`**: `{ session: { token, user } | null }`. One value instead of separate `token`/`user` fields, so "token without user" can't exist. Reducers `loggedIn` / `loggedOut` (wired up in D3-3).
- **Derived values:** only the items are stored. `selectCartCount` and `selectCartTotal` are memoized selectors (`createSelector`) that compute count and total (in cents) from the items, so they can never drift out of sync. The header badge (`Header.tsx`) reads `selectCartCount`.
- **Where state lives now:** server data → RTK Query cache (`state.api`). Cart and session → Redux slices. Filters → URL. Form inputs and toggles → component state.

**"State only changes through defined updates," enforced:** Immer freezes the state in development, so pushing to `cart.items` from outside a reducer throws `TypeError: object is not extensible`, and assigning `item.quantity = 99` throws `Cannot assign to read only property` (in strict-mode code, which all ES modules are). Dispatching `quantityChanged` with 999 for a product with 11 in stock results in 11, because the reducer applies its rules.

**Considered:**

- _React Context + `useReducer`._ Fine for small apps, but every consumer re-renders on any change, and there are no devtools or memoized selectors. D3-1 also asks for Redux Toolkit specifically.
- _Storing `count` and `total` in the slice._ Rejected: two sources of truth. Every reducer would have to remember to update them.
- _`createEntityAdapter` (items normalised by id)._ Good for large collections. A cart has a handful of lines, and a plain array is simpler to read and explain.
- _Storing only `productId` + `quantity` and looking up products from the API cache._ The cart page would then depend on cache entries that may have expired. A small snapshot (name, price, image, stock) keeps it self-contained, and the server re-checks stock and price at checkout.

## D3-2: Cart

**Used:**

- **Quantities can't exceed stock, enforced twice:** the cart reducer clamps every quantity to `0..stock` (D3-1), and the quantity picker is a `<select>` that only offers `1..stock`, so the UI can't even express an invalid quantity (no "0", "-3" or empty box).
- **Survives a reload:** `store.ts` subscribes to the store and saves `state.cart` to localStorage whenever it changes (a reference check: immutable state means "changed" = "different object"). On start-up, `loadCart()` reads it back as `preloadedState`, validated by the `isCartState` type guard, so a tampered or old cart (e.g. `quantity: -5`) becomes an empty cart instead of a crash.
- **Checkout** (`/checkout`) uses an RTK Query **mutation** (`createOrder`). The token is added once, in the base query, from `state.auth`. On success: go to `/orders/:id` and dispatch `cartCleared()`.
- **No duplicate orders, two layers:**
  1. The Place order button is disabled while a request is in flight (no double-click double-submit).
  2. **Idempotency key:** the checkout page generates one `crypto.randomUUID()` per order attempt and sends it as `Idempotency-Key` on **every retry of that same order**. The server stores key → order and returns the existing order for a repeated key. This covers the case the button can't: the order was saved but the reply was lost, and the user retries. Rule: same request → same key. After a 409 the cart changes, so the next attempt gets a **new** key.
- **409 names the item:** the error's `details` carry `productName` and `available`. The page shows "Sorry, only 1 of "Glow Debug Duck #42" is left. We've updated your cart…", and dispatches `stockUpdated` so the cart drops to the real stock (or removes a sold-out line). Raw server text is never shown.
- **Order confirmation** (`/orders/:id`) polls `GET /orders/:id` every 2 s until the status is `completed`, then stops. RTK Query's `pollingInterval` timer is cleared automatically when the page closes.

**Verified in the browser:**

| Criterion             | Result                                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quantities ≤ stock    | Picker offered exactly 1..11 for a product with 11 in stock                                                                                                                                                                                  |
| Survives reload       | 3 × duck, $74.97 before and after a full reload; a tampered cart (quantity −5) loaded as empty                                                                                                                                               |
| 409 names the item    | Another customer bought 10 of 11; placing 3 showed "Sorry, only 1 of "Glow Debug Duck #42" is left…" and the cart dropped to 1                                                                                                               |
| No duplicate on retry | With **Checkout: order saved, reply lost (500)** on, the first attempt saved the order but showed an error. The retry sent the **same** key (`66ce68fc-…`), got the same order back, and the result was 1 new order and stock 1 → 0 (not −1) |
| Polling stops         | Status went Processing → Confirmed, then 0 new requests in the next 6 s                                                                                                                                                                      |

**Considered:**

- _Disabling the button only._ Stops double-clicks, but not a retry after a lost reply. That's the case that causes real double charges.
- _Deriving the key from the cart contents (a hash)._ Buying the same cart again tomorrow would reuse the key, and the server would return yesterday's order. A random key per attempt avoids that.
- _Keeping the key across page reloads (e.g. stored with the cart)._ Would also cover "reply lost, then the user reloads and retries". Left out to keep the flow simple. The server-side idempotency is what makes adding it easy later.
- _Number input with +/− buttons._ Familiar, but needs extra handling for empty or invalid input while typing. The `<select>` is accessible by default and can't be invalid.

**Not yet:** logging in is done from the console in this task. The login page, protected routes and keeping the session after a reload come in D3-3.

## D3-3: Auth

**Used:** a `session: { token, user } | null` in Redux, mirrored to **sessionStorage**; a `RequireAuth` wrapper for `/checkout` and `/account`; central 401 handling in the RTK Query base query; a login page with a ref-based double-submit guard. The full reasoning, especially where the token is stored and the trade-off, is in [`docs/auth.md`](auth.md).

**Verified in the browser:** `/checkout` while logged out → `/login` → after login back on `/checkout` with the cart intact. Empty form → per-field 400 errors (`aria-invalid` + `aria-describedby`). Wrong password → "Email or password is incorrect", no session stored. Two `requestSubmit()` calls in the same instant → **1** request. Refresh keeps the session. **Session expired** switch + `/account` → `/api/me` 401 → token removed, redirected to `/login` with "Your session has expired". Header Log in from a product page → back on that product. Log out → token and cached private data cleared.

**Considered:**

- _localStorage / memory only / httpOnly cookie:_ compared in `docs/auth.md`.
- _Handling 401 in each page._ Easy to forget on one page. The base query sees every response, so the rule is written once.
- _Only disabling the button._ The disabled state applies on the next render, so two very fast submits could both get through. The ref check is synchronous.
- _Client-side validation only (`required`, `type="email"`)._ The form uses `noValidate` so the server's 400 field errors are shown consistently (and D3-4 can map them). Browser validation would be a nice extra on top, not a replacement: the server must validate anyway.

## D3-4: Backend errors

**Used: one mapping, used everywhere.** `describeError(error)` in `src/api/errorMessages.ts` turns any `ClientError` into a `UserError`, a discriminated union saying **what kind** of problem it is and the words to show. Pages decide only what to _do_ with each kind.

| Status           | `kind`         | What the user gets                                                                                                                                                                                                     | Where                               |
| ---------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 400              | `validation`   | "Please check the highlighted fields." + each field's message next to that field (`aria-invalid`, `aria-describedby`)                                                                                                  | Login form, checkout                |
| 401              | `unauthorized` | The **base query signs the user out** (only if a token was sent). Protected pages redirect to login: "Your session has expired". A wrong password (code `INVALID_CREDENTIALS`) gives "Email or password is incorrect." | `apiSlice.ts`, `RequireAuth`, login |
| 404              | `notFound`     | A Not Found view, no retry (it can't help). `QueryStateView`'s `notFound` option handles it for every one-item page                                                                                                    | Product, order, unknown URLs        |
| 409              | `outOfStock`   | Names the item and how many are left, and updates the cart to the real stock                                                                                                                                           | Checkout                            |
| 500              | `retryable`    | "Something went wrong on our side…" + **Try again**                                                                                                                                                                    | Every data view, login, checkout    |
| none (offline)   | `retryable`    | "We couldn't reach the server. Check your internet connection…" + **Try again**                                                                                                                                        | Same                                |
| 2xx but not JSON | `retryable`    | Treated as an error by `client.ts` (`INVALID_RESPONSE`) instead of crashing on `undefined` data                                                                                                                        | Everywhere                          |

**Raw error messages never reach the screen:**

- `error.message` from the server is never rendered. Only texts written in `errorMessages.ts` (plus 400 field messages, next to their fields) are shown.
- To make that **testable**, the mock now returns technical messages like a real backend ("Invalid credentials", "Product nope not found", "Missing or invalid bearer token", "Insufficient stock for p-0042: requested 3, available 1"). Any of them on screen would be an obvious leak.
- `checkoutMessage` switches over every `kind` with no `default`. Adding a new kind is a compile error until checkout handles it (an **exhaustive switch**).

**Verified in the browser** (a script checked the page text for 19 technical strings after each case, and found **0 leaks** in all of them):
login 400 / 401 / 500 / network down; product 404; order 404; unknown URL; product list 500; product details 500; product list network down; checkout 409 ("Glow Debug Duck #42" just sold out, cart updated); checkout network down ("You won't be charged twice", same key kept); session expired → signed out and redirected with a notice.

**Bug found by this testing:** the order confirmation page polled every 2 s "until completed". A missing order is never completed, so it polled a 404 forever and flickered to "Loading…" every 2 seconds. Polling now also stops after an error. Re-tested: 1 request, a stable Not Found screen, and real orders still poll through to "Confirmed".

**Considered:**

- _Error handling per page (the previous state)._ Login, checkout, product and order pages each had their own status checks and wording, and two messages for the same 401 already differed.
- _A global toast for every error._ Consistent, but a toast can't show field errors next to fields, can't replace a page with Not Found, and disappears before screen-reader users can act on it.
- _Showing the server's message when it "looks friendly"._ Couples the UI to backend wording, and one day the backend sends a stack trace.

## D3-5: Caching

**Used:** RTK Query's cache, with an explicit policy in `src/api/apiSlice.ts`:

- **Reuse:** each query result is cached per endpoint + arguments (`getProduct("p-0042")`). Product data stays cached for **5 minutes** after no page uses it (`keepUnusedDataFor: 300`).
- **Freshness window:** `refetchOnMountOrArgChange: 60`. When a page mounts, cached data younger than 60 s is used with **no request**. Older data is shown **immediately** and refreshed in the background (**stale-while-revalidate**). Pages read `currentData`, which keeps the old copy on screen during that refresh, so there's no loading flash.
- **Precise invalidation with tags:** `getProduct` provides `Product:<id>`, and every product list provides a tag for **each product it contains**. `createOrder` invalidates the ordered products (and, after a 409, the product that sold out, since the 409 proves our copy was wrong). RTK Query refetches exactly the entries carrying those tags: that product's page **and** every cached list showing it. Nothing else.
- **Logout** wipes the cache (`resetApiState`, D3-3) so private data doesn't outlive the session.

**Verified in the browser:**

| Check                  | Result                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revisiting reuses data | 5 visits list ↔ duck: **1** request for the duck, **0** extra for the list. Every revisit showed content at once                                             |
| Stock after our order  | Duck page and search list showed **9**. After buying 2 via checkout, both showed **7** without a reload (1 refetch each, from the invalidated tag). Server: 7 |
| Stale-while-revalidate | Revisited a product cached **64 s** earlier: content on screen after 30 ms, no loading state, **1** background request                                        |

### When stale data is acceptable

Stale data is fine when **being slightly out of date can't cause a wrong outcome**, and something downstream catches it if it matters.

| Data                                  | How stale may it be?                                              | Why that's OK, and what protects us                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name, price, image, rating            | Minutes                                                           | Rarely change. Checkout sends only ids + quantities, so the **server prices the order**, not our cached copy                                                    |
| Stock (in lists and on product pages) | Up to ~60 s on revisit; immediately fresh after **our own** order | It's display only. The **server re-checks stock at checkout** (409 names the item and fixes the cart), so stale stock can't oversell. Live updates come in D4-4 |
| Search results / list order           | Minutes                                                           | A slightly old list is still a useful list. Refreshed in the background on revisit                                                                              |
| Order status                          | Seconds                                                           | The user is actively watching it, so it's **polled** every 2 s until completed                                                                                  |
| Account (`/me`)                       | Not across users                                                  | Tied to the session. Wiped on logout. A 401 clears it                                                                                                           |
| Cart                                  | Never "stale": it's client state                                  | It's ours, not a copy of server data. Stock in it is a snapshot, corrected by the server on checkout                                                            |

**Rule of thumb:** cache what's expensive and slow-changing, invalidate precisely what **we** just changed, bound the staleness of what **others** change, and let the server be the final judge for anything involving money or stock.

**Considered:**

- _No caching (`refetchOnMountOrArgChange: true` everywhere)._ Always fresh, but every Back/forward costs a request and a loading spinner, which is exactly what this task asks us to avoid.
- _Invalidating all products after any order (one `LIST` tag)._ Simpler, but it refetches every cached list and page, even for products we didn't buy. Per-product tags refetch only what changed.
- _`refetchOnFocus` / polling for stock._ Considered for stock freshness. Live stock is D4-4's job (a push-based feed), so the cache doesn't need to poll.
