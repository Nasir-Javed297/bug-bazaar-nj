# 10-minute walkthrough

A script for the final walkthrough: **demo the full shopping flow, one hard bug, one trade-off.** The times add up to 10 minutes. The words in quotes are a guide; say them in your own way.

## Before you start (2 minutes, not counted)

1. `npm run dev` and open <http://localhost:5173> in a **visible, front** browser tab (a hidden tab pauses some updates, see AI mistake 2).
2. Open 🛠 **Dev tools** (bottom-left corner) → **Reset orders and stock**. Make sure every switch is **off**.
3. Log out if you're logged in. Empty the cart.
4. Have these open in editor tabs: `src/pages/CheckoutPage.tsx`, `src/pages/OrderConfirmationPage.tsx`, `docs/ARCHITECTURE.md`, `docs/auth.md`, `docs/performance.md` (for the backup trade-off).
5. Make the browser window wide (at least 1280 px), so the filters sit in the left sidebar and the grid shows 4 cards per row.
6. Use a **fresh tab** opened after `npm run dev` started. If products ever show "We couldn't find what you were looking for." while every Dev tools switch is off, the tab lost the mock API (it can happen after the dev server restarts): close the tab and open <http://localhost:5173> in a new one.

## 0:00–1:00 · What it is (1 min)

> "The Bug Bazaar is a store for developer gear, built with React and strict TypeScript. Server data goes through RTK Query, the cart and login live in Redux, and filters live in the URL. There's no real backend: MSW pretends to be one in the browser, with 5,000 products, and the Dev tools let me break it on purpose. Every task has its own commit and a decision in `decisions.md`."

Show `docs/ARCHITECTURE.md` section 3a (the diagram) for a few seconds: "a page asks a hook, the hook asks the cache, the cache asks one HTTP client."

## 1:00–6:00 · The full shopping flow (5 min)

| Step                                  | Do                                                                                                                                                     | Say                                                                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Browse                             | Home page. Type `duck` in the **search box above the grid**. In the **left sidebar**, click **Rubber ducks** under Category and tick **In stock only** | "Search waits 300 ms after I stop typing, so one request, not four. The filters are in the sidebar, and the heading changes to the category."                                                                      |
| 2. URL state                          | Point at the address bar, press **Back** once                                                                                                          | "Every filter is in the URL, so links can be shared, and Back undoes one step."                                                                                                                                    |
| 3. All products, loaded as you scroll | Click **Clear filters**. Set **Show** to **All products**. Point at "Showing 24 of 5000 products", then scroll down twice                              | "'All' doesn't download 5,000 products. It loads 24, then 24 more each time I get near the bottom: 3.4 KB at a time instead of 694 KB. The grid is still virtualized, so the page only ever holds about 40 cards." |
| 4. Details + live stock               | Open a product from far down the list. Point at "Live stock" and wait for the stock number to change                                                   | "This page subscribes to this product over a WebSocket. The stock changes without a refresh."                                                                                                                      |
| 5. Back to the same place             | Press the browser's **Back**                                                                                                                           | "I'm back at the same scroll position, and everything I'd loaded is still there, because the batches stay in the cache."                                                                                           |
| 6. Cart                               | Back on the list, click **Add to cart** on two cards (the card shows **In your cart (1)**). Open the cart, change a quantity                           | "The header count updates everywhere. The quantity can't go above the stock. Refresh: the cart is still there (localStorage)." Refresh to show it.                                                                 |
| 7. Login redirect                     | Click **Checkout**                                                                                                                                     | "Checkout is protected. I'm sent to log in and then brought back." Log in with `demo@bugbazaar.dev` / `password123`.                                                                                               |
| 8. A failure, on purpose              | Dev tools → **Checkout: order saved, reply lost (500)** on. Click **Place order**                                                                      | "The server saved the order, but the reply was lost. The shopper sees an error, and the message promises they won't be charged twice."                                                                             |
| 9. Safe retry                         | Point at "You won't be charged twice." Switch the switch **off**, click **Place order** again                                                          | "The retry sends the same idempotency key, so the server returns the same order instead of making a second one. No double charge."                                                                                 |
| 10. Confirmation                      | Watch the status change                                                                                                                                | "The order goes queued → processing → completed. The page checks every 2 seconds and stops when it's done."                                                                                                        |

If time is short, skip step 5 (or step 2).

## 6:00–8:15 · One hard bug: polling that never stopped (2¼ min)

> "The confirmation page polls until the order is completed. The first version only stopped on 'completed'. Nobody, including the AI, asked: what if it's never completed?"

1. **Show it:** while logged in, open `/orders/o-does-not-exist`.
   > "A missing order returns 404. It's never 'completed', so the old version polled forever: a request every 2 seconds, and the page flickered between 'Loading…' and the error."
2. **How I found it:** "In D3-4 I was checking every error type, and this one showed 'Loading your order…' instead of 'Order not found'. The network list showed the same 404 again and again."
3. **The fix** (show `OrderConfirmationPage.tsx`, the `pollingInterval` line):
   > "Polling is 0 (off) when the order is completed **or** the last request failed. Now a missing order makes 1 request and shows 'Order not found'. A real order still reaches "Confirmed"."
4. **The lesson:** "For every 'repeat until X' loop, ask what happens if X never comes. It's in my AI notes as mistake 4."

**Backup bug, if asked for another:** the stock feed's backoff never grew (AI mistake 6). It reset on "open", so a server that accepts connections and drops them got a retry every ~1 s from every browser. Now it resets only after 5 s of a stable connection. Retries: 1.4 → 2.0 → 3.7 → 7.0 → 14.8 s.

## 8:15–9:30 · One trade-off: where the login token is stored (1¼ min)

Show `docs/auth.md`, the table under "Where the token is stored, and the trade-off".

> "I keep the token in Redux while the app runs, and copy it to sessionStorage so a refresh doesn't log you out.
>
> - **Only in memory:** safest, but every refresh logs you out.
> - **localStorage:** survives everything, but stays on the computer after the tab closes, and any script on the page can read it.
> - **httpOnly cookie:** JavaScript can't read it at all, so it's the safest, but it needs a real server to set it, and we only have a mock.
>
> I picked sessionStorage: it survives a refresh and is gone when the tab closes. The price is that a script injected into the page (XSS) could read it. I reduce that risk because React escapes text, I never use `dangerouslySetInnerHTML`, and there are no third-party scripts. With a real backend, I'd switch to an httpOnly cookie."

**Backup trade-offs, if asked for another:**

- **Infinite loading for "All products"** (`docs/performance.md`, last section): the first download went from **694 KB to 3.4 KB**, and the grid stays virtualized. The costs: the footer is only reachable once every product is loaded (or by using the **Load more products** button instead of scrolling), and it needed a Redux Toolkit upgrade (2.3 → 2.8.2) for built-in infinite queries. Infinite loading _without_ virtualization was rejected: after a long scroll the page would hold thousands of cards again.
- **Filters in the URL instead of Redux** (`docs/ARCHITECTURE.md` section 5): links, Back and reload all work, at the cost of validating the URL, because anyone can type into it.

## 9:30–10:00 · Wrap-up (30 s)

> "Everything is checked by CI: types, lint, formatting, 42 tests and the build, and `main` won't accept a red PR. Lighthouse accessibility is 100. My two weakest areas are WebSocket backoff and system design, and `reflection.md` has my plan for each."

## Questions they might ask

| Question                                             | Short answer                                                                                                                                                                      | Where                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Why RTK Query and not `useEffect` + `fetch`?         | Caching, refetching, loading/error flags and cache invalidation for free, and no race conditions to handle by hand                                                                | `decisions.md` D1-4               |
| What's in the URL vs Redux vs the cache?             | Filters in the URL; cart and login in Redux; server data in the RTK Query cache; one-component things in `useState`                                                               | `ARCHITECTURE.md` §4              |
| How do you stop a slow search reply from showing?    | The page only shows `currentData`, the data for the **current** query, so an old reply is ignored                                                                                 | `decisions.md` D2-6               |
| What happens on a 401?                               | The base query logs out with reason "expired" and the login page explains it, then sends you back                                                                                 | `auth.md`                         |
| Why did you virtualize the list?                     | 5,000 cards took 1,225 ms and froze scrolling at 33 fps. Now only visible rows exist: ~84 ms and 60 fps                                                                           | `performance.md`                  |
| Why infinite loading AND virtualization?             | They fix different costs. Infinite loading cuts the **download** (24 at a time, 3.4 KB). Virtualization cuts the **drawing** (only ~40 cards in the page, however far you scroll) | `performance.md`                  |
| How does a keyboard or screen-reader user load more? | A real **Load more products** button under the grid; scrolling just presses it automatically. "Showing 48 of 5000 products" is announced, and each card says "item 37 of 5000"    | `decisions.md` (infinite loading) |
| What if loading the next batch fails?                | The products already shown stay, an alert explains it, and **Try again** loads it. No automatic retry, so a broken network isn't hammered                                         | `decisions.md` (infinite loading) |
| Why radio buttons for Category?                      | Only five options, so a visible list is faster to scan than a dropdown. They're real radio inputs in a `fieldset`, so keyboards and screen readers work as usual                  | `decisions.md` (Theme)            |
| What's a type guard?                                 | A function that checks unknown data at runtime and tells TypeScript its type, e.g. `isCategory`                                                                                   | cheat sheet                       |
| What does the queue design add?                      | A fast reply, email outages don't fail orders, spikes wait in line, and each worker scales on its own                                                                             | `orders.md`                       |
| What did AI get wrong?                               | 7 logged mistakes, e.g. polling forever, the backoff that never grew. Each one was found by testing the unhappy path                                                              | `ai-notes.md`                     |

**If you don't know an answer:** say so, say where you'd look, and connect it to a gap in `reflection.md`. That's better than guessing.
