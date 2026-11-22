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
