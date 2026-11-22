# TypeScript cheat sheet (for this project)

Every pattern used in The Bug Bazaar, with a **real example from our code** and the **JavaScript equivalent**.

> **The one idea to remember:** TypeScript is JavaScript plus **labels**. The labels are checked by `npm run typecheck` and your editor, then **deleted** when the app is built. The browser only ever runs plain JavaScript.

**Tip:** in VS Code, hover over any variable to see its type. It's the fastest way to learn.

---

## 1. How to read a type out loud

| Type                      | Read it as                                                |
| ------------------------- | --------------------------------------------------------- |
| `name: string`            | "name is a string"                                        |
| `items: Product[]`        | "items is an array of Products"                           |
| `search?: string`         | "search is a string, **or missing**"                      |
| `"ducks" \| "coffee"`     | "either the text ducks **or** the text coffee"            |
| `(id: string) => Product` | "a function that takes a string id and returns a Product" |
| `() => void`              | "a function that takes nothing and returns nothing"       |
| `Promise<Product[]>`      | "a promise that will give an array of Products"           |
| `Record<string, string>`  | "an object whose keys are strings and values are strings" |
| `Product \| undefined`    | "a Product, or undefined (maybe not found)"               |

---

## 2. Describing an object: `type`

```ts
// src/types/api.ts
export type Product = {
  id: string;
  name: string;
  price: number; // cents
  stock: number;
};
```

```js
// JavaScript: no equivalent. You'd just have to remember the shape.
```

**Why:** if you write `product.prise`, TypeScript says _"Property 'prise' does not exist on type 'Product'"_ before you even run the app.

---

## 3. Optional fields: `?`

```ts
// src/types/api.ts
export type ProductsQuery = {
  search?: string; // may be missing
  page?: number;
};
```

Related JavaScript operators you'll see everywhere (these are plain JS, not TypeScript):

```ts
query.search?.trim(); // ?.  "if search exists, call trim(), otherwise undefined"
query.page ?? 1; // ??  "use page, but if it's null/undefined use 1"
```

---

## 4. "Only these values": union of literals

```ts
// src/types/api.ts
export const CATEGORIES = ["keyboards", "ducks", "coffee", "stickers"] as const;
export type Category = (typeof CATEGORIES)[number];
// Category = "keyboards" | "ducks" | "coffee" | "stickers"
```

- `as const` means "this array never changes, so remember the exact strings".
- `(typeof CATEGORIES)[number]` means "the type of any element of that array".
- **Why this way:** the list is written **once**. The array is used at runtime (for a dropdown), and the type is used for checking.

---

## 5. Discriminated union + narrowing ⭐ (the most important one)

```ts
// src/types/request.ts
export type RequestState<TData, TError = string> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: TData }
  | { status: "error"; error: TError };
```

Each variant has a `status` (the "discriminant") and **only** the fields that make sense for it. TypeScript **narrows** the type after each check:

```tsx
// src/pages/ProductListPage.tsx
switch (state.status) {
  case "loading":
    return <p>Loading…</p>; // here: state has NO data
  case "error":
    return <p>{state.error.code}</p>; // here: state.error exists
  case "success":
    return <p>{state.data.total}</p>; // here: state.data exists
}
```

```js
// JavaScript version: 3 separate flags, which allows impossible combinations
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);
// loading=true AND error="boom" AND old data... all at once. Nothing stops it.
```

**Say it like this:** _"Only one state can exist at a time, and TypeScript won't let me read `data` until I've checked the status is success."_

The same idea is used in `ApiResult<T>` (`src/api/client.ts`): `{ ok: true; data } | { ok: false; error }`.

---

## 6. Typing component props

```tsx
// src/components/ProductCard.tsx (arrives in D2-1; every component follows this pattern)
type ProductCardProps = {
  product: Product;
  onAddToCart: (id: string) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  ...
}
```

```jsx
// JavaScript
export function ProductCard({ product, onAddToCart }) { ... }
```

**Why:** `<ProductCard prodcut={p} />` (typo) or a missing prop becomes a red error immediately.

---

## 7. React hooks and events

```tsx
// useState with a type: <...> says what the state holds
const [scenarios, setScenarios] = useState<MockScenarios>(getScenarios);
const [title, setTitle] = useState("");      // type inferred: string, no label needed

// Event types
const handleSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); };
onChange={(e) => setTitle(e.target.value)}   // inline: type is inferred automatically
```

**Rule of thumb:** if TypeScript can work the type out by itself (**inference**), don't write it. `useState("")` is clearly a string.

---

## 8. Functions: parameters and return types

```ts
// src/mocks/db.ts
export function getProduct(id: string): Product | undefined {
  return productsById.get(id);
}
```

Read it as: _"takes a string, returns a Product or undefined"_. The `| undefined` **forces** callers to handle "not found":

```ts
const product = getProduct("p-0042");
product.name; // ❌ error: product might be undefined
if (product) product.name; // ✅ narrowed
```

Async functions return a `Promise<...>`:

```ts
// src/api/client.ts
export async function apiRequest<T>(path: string): Promise<ApiResult<T>> { ... }
```

---

## 9. Generics: `<T>` = "fill in the type later"

A generic is a type with a **blank** to fill in, like a function parameter but for types.

```ts
type RequestState<TData> = ... { status: "success"; data: TData } ...

RequestState<Product>          // data is a Product
RequestState<ProductsResponse> // data is { items, total }
```

You mostly **use** generics (`useState<...>`, `Promise<...>`, `RequestState<...>`). You rarely need to write new ones.

---

## 10. `unknown` instead of `any`, and type guards

`any` switches checking **off** (banned by our lint rules). `unknown` means "could be anything, **prove** what it is before using it".

```ts
// src/api/client.ts
} catch (err: unknown) {
  // fetch failed with no response. Was it cancelled, or a network problem?
  const aborted = err instanceof DOMException && err.name === "AbortError";
}
```

A **type guard** is a function that does the proving, so it can be reused. Note the `value is Category` return type:

```ts
// src/types/api.ts
export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

const raw = params.get("category") ?? ""; // string (from the URL)
if (isCategory(raw)) {
  // here raw is a Category
}
```

**Use `unknown` for anything from outside the app:** JSON from the network, `localStorage`, URL params, `catch` errors.

---

## 11. `Record<Key, Value>`

```ts
// src/mocks/scenarios.ts
export const SCENARIO_LABELS: Record<keyof MockScenarios, string> = {
  failProductList: "Product list fails (500)",
  ...
};
```

Read it as: _"an object with one string for **every** key of MockScenarios"_. Add a new scenario and forget its label, and TypeScript flags it.

`keyof MockScenarios` = `"failProductList" | "serverOutage" | ...` (the union of its key names).

---

## 12. `as` (type assertions): use sparingly

`as` tells TypeScript _"trust me, I know the type"_. It **doesn't check anything**, so a wrong `as` is a hidden bug.

```ts
// OK: our own data, written by our own code
const state = JSON.parse(raw) as PersistedState;

// OK: the select only contains valid options
setSort(e.target.value as SortOption);
```

**Rule:** prefer a type guard (section 10). Use `as` only when you can explain why it's safe.

---

## 13. `import type`

```ts
import type { Product } from "../types/api";
```

"This import is only a label." It's deleted at build time, so it can never add code to the bundle. Our lint rule requires it for type-only imports.

---

## 14. Built-in helper types used in this project

| Helper                  | Meaning                       | Where                 |
| ----------------------- | ----------------------------- | --------------------- |
| `Pick<T, "a" \| "b">`   | Only fields `a` and `b` of T  | `src/api/apiSlice.ts` |
| `ReturnType<typeof fn>` | Whatever type `fn` returns    | `src/store/store.ts`  |
| `typeof value`          | The type of an existing value | `src/types/api.ts`    |
| `Promise<T>`            | A promise that resolves to T  | `src/api/client.ts`   |

---

## 15. Strict mode: `null` and `undefined` must be handled

```ts
// src/main.tsx
const rootElement = document.getElementById("root"); // HTMLElement | null
if (!rootElement) throw new Error("Missing #root");
ReactDOM.createRoot(rootElement); // ✅ TypeScript now knows it's not null
```

With `noUncheckedIndexedAccess`, reading `array[0]` gives `T | undefined`, because the array might be empty.

---

## Common error messages, decoded

| Error says                                            | It means                                | Usual fix                                      |
| ----------------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `implicitly has an 'any' type`                        | TS can't work out the type              | Add a type to the parameter or prop            |
| `Property 'x' does not exist on type 'Y'`             | Typo, or the field isn't on that type   | Check spelling / the type definition           |
| `Type 'string' is not assignable to type 'number'`    | Wrong kind of value                     | Convert it (`Number(x)`) or fix the type       |
| `Object is possibly 'undefined'`                      | Value might be missing                  | Check first: `if (x)`, `x?.y`, `x ?? fallback` |
| `'err' is of type 'unknown'`                          | Must prove the type before use          | `err instanceof Error ? ... : ...`             |
| `Argument of type '"shoes"' is not assignable to ...` | Value isn't one of the allowed literals | Use one of the allowed values                  |

---

## Likely evaluator questions

- **Why TypeScript strict mode?** It catches mistakes (typos, missing null checks, wrong shapes) before the code runs, and the types document the API contract.
- **How do you prevent impossible states?** With a discriminated union (`RequestState`): one `status`, and each variant only carries the fields that make sense for it.
- **`any` vs `unknown`?** `any` turns checking off. `unknown` forces you to check the type first. We ban `any` with ESLint.
- **When do you use `as`?** Rarely, only when I know more than the compiler (our own stored data). For outside data I use type guards.
- **Do types exist at runtime?** No. They're removed at build time, which is why outside data (network, storage, URL) still needs runtime checks.

---

## 16. `Partial<T>`: "any subset of the fields"

```ts
// src/hooks/useProductFilters.ts
updateFilters(changes: Partial<ProductFilters>)

updateFilters({ sort: "price-asc" });            // ✅ only one field
updateFilters({ category: "ducks", page: 2 });   // ✅ any combination
updateFilters({ colour: "red" });                // ❌ not a ProductFilters field
```

`Partial<ProductFilters>` is `ProductFilters` with every field made optional (`?`). Perfect for "change some settings".

## 17. Default parameter values

```ts
// src/pages/NotFound.tsx
export function NotFound({ title = "Page not found", message = "..." }: NotFoundProps);
```

Plain JavaScript (not TypeScript): if `title` isn't passed, it's `"Page not found"`. The type marks it optional with `title?: string`.

## 18. Generic components and render props

```tsx
// src/components/QueryStateView.tsx
type QueryStateViewProps<T> = {
  state: RequestState<T, ClientError>;
  children: (data: T) => ReactNode; // a FUNCTION as children = "render prop"
};
export function QueryStateView<T>({ state, children }: QueryStateViewProps<T>) { ... }

// src/pages/ProductDetailsPage.tsx
<QueryStateView state={state} ...>
  {(product) => <h1>{product.name}</h1>}   {/* product is typed as Product automatically */}
</QueryStateView>
```

- `<T>` on the component: TypeScript works out `T` from the `state` you pass (here `T = Product`).
- The render prop is only called when the data exists, so the page can't use `product` while loading.
- `ReactNode` = "anything React can render" (JSX, text, `null`...).
