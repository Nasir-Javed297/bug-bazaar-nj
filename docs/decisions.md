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
- *Keeping JavaScript with JSDoc types.* Rejected: TypeScript is a fixed requirement, and JSDoc checks are weaker and easy to skip.
- *Loose mode first, strict later.* Rejected: the codebase is small, so going straight to strict was cheap. Turning it on later always costs more.
- *Boolean flags (`isLoading`, `isError`).* Rejected for the reason above: they allow impossible combinations.

**Rule:** no `any` and no `@ts-ignore`. When TypeScript doesn't know a type (for example `catch (err)`), we narrow `unknown` with checks like `err instanceof Error`.
