# Architecture review (task D5-5)

Reviewer: Nasir-Javed297

Repository: [mumairkhan115/Bug-Bazaar-Umair](https://github.com/mumairkhan115/Bug-Bazaar-Umair), branch `dev`, commit `a2da2db`, file [`docs/ARCHITECTURE.md`](https://github.com/mumairkhan115/Bug-Bazaar-Umair/blob/dev/docs/ARCHITECTURE.md)

**How I reviewed it:** I read the doc, then checked each claim against the code on `dev` (imports, who calls what, where state is stored). Claims I could confirm are marked "checked". The risks below were found by reading the code; I didn't run the app.

## Strengths

1. **The API contract lives in one pure function, and that really is how the code works.** `handleApi` in `src/domain/api.ts` decides every status code (400, 401, 404, 409, 500). `server/mockApi.ts` only turns HTTP into a call to it, and `src/domain/behavior.test.ts` tests the rules directly, with no server or network. Checked: nothing in `src/` outside the tests imports `handleApi`, so React can't depend on the mock by accident. This is a clean design: the "fake backend" behaves the same in the browser, in preview and in tests, and every error case can be tested in milliseconds.

2. **The state table and the patterns are short, honest and checkable.** Each pattern has a one-line "Why", and the examples match the code:

   - `ProductCard` really is presentational: it gets `product` and `onAdd` as props and imports nothing from Redux (checked).
   - The cart count is derived, not stored: `AppLayout` reads `selectCartCount`, a `createSelector` over the cart items (checked).
   - Persistence really is in a Redux middleware (`persistState` in `src/stores/store.ts`, checked).

   The "Decisions worth defending" section also names a real trade-off (paging instead of virtualization, to keep Ant Design's `Row`/`Col` layout) instead of only listing what was used.

## Risks

1. **Stock lives in two places that don't talk to each other, so a page can show and sell stale stock.**

   - Live updates from the WebSocket go into **page-local state** only: `CatalogPage` keeps a `stockOverlay` in `useState` and lays it over the products.
   - Every other GET result is kept in `src/services/api/cache.ts`, a `Map` with **no time limit**. Entries are only dropped by `invalidateProductCache()` after a **successful** order from this tab (`services/api/orders.ts`), not after a 409.
   - `ProductPage` doesn't use the stock feed and reads its product through that cache.

   Example: open product p-0042 (stock 5 is cached), go back to the catalog, and the live feed shows it sell out (0). Open p-0042 again and the cached response still says **5 in stock**, with **Add to cart** enabled, until the tab places an order. Checkout's 409 will catch it in the end, but the shopper is shown something false first.

   The doc's state table lists stock under "Server → mock API, then the GET cache" and doesn't mention the overlay, so this split isn't visible to a reader.

2. **The dependency rule in the doc doesn't match the imports, and `domain/` mixes the contract with mock-only code.**

   - The doc says `router / stores -> features -> services -> domain`, but:
     - `components/ui/AppLayout/AppLayout.tsx` imports `features/cart/cartSlice`, so the shared shell depends on a feature (the opposite direction of a typical "shared UI" layer).
     - `components/` and `hooks/` aren't in the chain at all.
     - Features import `domain` directly (types, `money`), skipping `services`.
   - `domain/` is described as "types and the mock contract, shared with the Vite server". It contains code the browser needs (`isCategory`, `isSortKey`, imported by `hooks/useUrlFilters.ts`) next to code that only the fake server should use (`createCatalog()` builds the 5,000 products, `delayFor()` simulates network delay). Today the bundler probably drops the unused functions, but nothing in the structure stops a component from importing server-only logic. I didn't check the built bundle.

   Neither problem breaks anything now. The risk is that the doc's rule can't be used to decide where new code goes, because the code already breaks it.

## Recommendation

One change that would reduce the larger risk (risk 1):

**Give stock one home, and document it in a "Caching rules" section with a data-flow diagram.**

- **In the code:** let live updates write into the same cache the pages read, e.g. a `patchCachedProduct(id, stock)` in `cache.ts` that updates `/api/products/:id` and any cached list containing that id. Call it from the stock feed. Also run `useStockFeed` on `ProductPage`, and invalidate the sold-out product on a 409. A simpler fallback is a short time limit (say 30–60 s) on product entries. (For comparison, in my app the live feed edits the RTK Query cache entries directly, so lists and details can't disagree.)
- **In the doc:** replace the text arrow list with a small diagram of the three real paths: a GET through the cache, an order POST that invalidates it, and a WebSocket update that patches it. Below it, add a short list: what is cached (product list and details, not `/api/me` or orders, because those pass `cache: false`), for how long, and what removes an entry. Drawing that diagram is what makes the two-homes problem in risk 1 visible.
