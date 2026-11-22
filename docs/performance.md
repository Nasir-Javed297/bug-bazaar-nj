# Performance

Measurements of the product list (task D4-2) and the optimizations that came out of them (task D4-3).

## How it was measured

- **Always the production build** (`npm run build && npm run preview`). Development mode is much slower (dev checks, StrictMode double renders, no minification) and would mislead.
- **What a shopper waits for:** time from an action until the products are **painted**, measured inside the page with `scripts/perf-list.js` (paste it into the DevTools console):
  - **Rendered after response:** from the API response arriving to the products being on screen. This is the app's own work.
  - **Longest task / slowest frame:** the longest time the main thread was blocked. Above 50 ms the page can't react to clicks or typing.
  - **Slowest frame split** (Chrome's Long Animation Frame API): **script** (our JavaScript, i.e. React) vs **style & layout** (the browser sizing and positioning elements).
  - **Scrolling:** scroll 400 px per frame for 3 s and record each frame's duration. Smooth = 60 fps (16.7 ms per frame).
- The mock API adds a **deliberate** 100–400 ms "network" delay per request, which is why request times are reported separately and not counted as app work.
- Chrome 156, desktop, the browser pane of the Claude desktop app. Absolute numbers will differ on other machines. The **before/after ratios** are what matter.

## Step 1: measure everything, find what's actually slow

| What                                                    | Result                                                                                                     | Slow?   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------- |
| Cold page load (LCP)                                    | 356 ms, of which ~143 ms is the simulated network                                                          | No      |
| 24 products per page: rendered after response           | ~46 ms, no long tasks                                                                                      | No      |
| 96 per page                                             | 51–66 ms, 1,047 DOM elements, scroll 60 fps                                                                | No      |
| Mock server: search / filter / sort over 5,000 products | 0.1–5 ms per request                                                                                       | No      |
| Generating 5,000 products at start-up                   | 3.5 ms, once                                                                                               | No      |
| Payload of 5,000 products vs 24                         | +14 ms                                                                                                     | No      |
| **All 5,000 products** (`?perPage=all`)                 | **rendered 1,225 ms after the response; one 1,102 ms frozen frame; 50,083 DOM elements; scrolling 33 fps** | **Yes** |

At 24 per page there is nothing worth fixing: every visible delay is the simulated network or the intentional 300 ms search debounce (D2-5). The cost appears when **many** products are shown at once, which the store needs because D4-3 requires the 5,000-item list to stay smooth. So a **Show: 24 / 96 / All** filter was added (in the URL like the other filters), and the "All" view was profiled:

**The slowest frame when showing all 5,000 products (fresh data):**

| Part               | Time       | Meaning                                                                                      |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------- |
| **Style & layout** | **650 ms** | The browser sizing and positioning 50,000 elements, almost all off-screen → **slow spot #1** |
| **Script**         | **447 ms** | React building 5,000 cards in one go → **slow spot #2**                                      |

## Fix #1: skip layout for off-screen cards (`content-visibility: auto`)

```css
.product-grid > li {
  content-visibility: auto; /* skip style/layout/paint until near the viewport */
  contain-intrinsic-size: auto 340px; /* placeholder height until measured */
}
```

| All 5,000 products                  | Before                       | After fix #1                         |
| ----------------------------------- | ---------------------------- | ------------------------------------ |
| Style & layout in the slowest frame | 650 ms                       | **65 ms** (10× less)                 |
| Rendered after response             | 1,225 ms                     | **583 ms**                           |
| Longest frozen moment               | 1,146 ms                     | **501 ms**                           |
| All + "In stock" (4,629 products)   | 824 ms render, 757 ms frozen | **529 ms** render, **431 ms** frozen |
| Scrolling                           | 33 fps, p95 41 ms            | 36 fps, p95 33 ms                    |

**Why it works:** the browser no longer computes layout for cards nobody can see. The cards stay in the page, so find-in-page, keyboard focus and screen readers still reach them. **What it didn't fix:** the script part (React still builds 5,000 cards), and scrolling was still choppy.

## Fix #2: render only the visible rows (virtualization)

`src/components/VirtualProductGrid.tsx` with `@tanstack/react-virtual` (`useWindowVirtualizer`): the list keeps the full scroll height, but only the rows on screen plus 3 rows of buffer exist in the page. The column count follows the width (same rule as the CSS grid), and real row heights are measured. Used only above 96 items (`ProductGrid.tsx`). The 24/96 views stay a plain `<ul>`.

| All 5,000 products                  | Baseline          | After fix #1      | **After fix #2**                           |
| ----------------------------------- | ----------------- | ----------------- | ------------------------------------------ |
| Rendered after response             | 1,225 ms          | 583 ms            | **83–85 ms**                               |
| Slowest frame                       | 1,102 ms          | 386–631 ms        | **71–77 ms**                               |
| DOM elements                        | 50,083            | 50,083            | **238**                                    |
| Cards in the page                   | 5,000             | 5,000             | **15** (30 while scrolling)                |
| Scrolling (3 s, to 72,800 px)       | 33 fps, p95 41 ms | 36 fps, p95 33 ms | **60 fps, p95 19 ms, 0 frames over 50 ms** |
| All + "In stock" from cache (4,629) | 824 ms            | 529 ms            | **20 ms**, no long tasks                   |

**Accessibility kept:** each item has `aria-setsize` / `aria-posinset` ("item 41 of 4,629"). **Keyboard verified:** 40 presses of Tab from the first card reached item 41, with the page scrolling along and the focus outline visible. **Trade-off:** off-screen products aren't in the page, so browser find-in-page only searches the visible rows. That's acceptable because the store's own search filters all 5,000, and it's why virtualization is only used for the "All" view.

## Tried, measured, not kept

**Hypothesis:** every card calls `useLocation()` (5,000 router subscriptions) to build its "Back to list" link. Computing it once in the grid should cut the script time.

| Variant (all 5,000, 3 fresh samples each) | Script time        | Median |
| ----------------------------------------- | ------------------ | ------ |
| `useLocation` in every card (kept)        | 585 / 442 / 390 ms | 442 ms |
| `from` computed once in the grid          | 360 / 503 / 457 ms | 457 ms |

No measurable difference (smaller than the noise), so the change wasn't kept. The script cost is building 5,000 cards, not the router hook. That's what led to virtualization.

**Also rejected after checking how it would behave here:** `useDeferredValue` to render the big list in the background. In React 18 it doesn't defer on a component's first mount (our grid mounts fresh when data arrives), and updates coming from the Redux store via `useSyncExternalStore` are always synchronous.
