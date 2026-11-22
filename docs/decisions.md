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
