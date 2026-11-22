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
