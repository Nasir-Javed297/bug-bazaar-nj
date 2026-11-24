# Glossary

Six terms that come up in this project, explained in plain words. Each has an example from The Bug Bazaar, pointing to the code where it happens, and a one-line version to say out loud.

## Latency

**In my words:** the waiting time between asking for something and getting the answer. It's about **delay**, not speed of work: a request can be tiny and still take a long time because it travels far or waits in a line.

**In the store:**

- The mock API adds 100–400 ms of fake network latency to every request (`src/mocks/handlers.ts`), and the Dev panel's **slow network** switch makes it 2–4 s. That's how I checked that every page shows a loading state instead of a blank screen.
- Typing "duck" in search would send 4 requests and wait 4 times. The 300 ms debounce (`ProductListPage.tsx`) sends one, after you stop typing.
- When latency is uneven, answers can arrive in the wrong order: the reply for "d" might come after the reply for "duck". The **out-of-order search** switch tests this, and the page only shows the reply for the current query (`currentData`).
- Latency is also why the cache matters: going back to a list you've seen shows it instantly, with no wait at all.

**One line:** latency is how long you wait for the answer, and we hide it with loading states, debouncing and caching.

## Idempotency

**In my words:** doing the same request twice has the same effect as doing it once. Pressing a lift button five times still calls one lift.

**In the store:** placing an order. Each checkout attempt gets a random key (`crypto.randomUUID()` in `CheckoutPage.tsx`) sent as the `Idempotency-Key` header. If the order was saved but the reply got lost and the shopper clicks **Try again**, the same key goes with the retry. The server sees a key it already knows and returns the **same** order instead of creating a second one (`createOrder()` in `src/mocks/db.ts`). Tested with the **order saved, reply lost** switch: 1 order, stock 1 → 0, not −1. Some requests are idempotent by nature: `GET /products/p-0042` can be repeated forever and changes nothing.

**One line:** idempotency means a retry can't do the thing twice, which is what stops a lost reply from turning into a double charge.

## Horizontal scaling

**In my words:** handling more traffic by adding **more machines** that do the same job, instead of buying one bigger machine (that's vertical scaling). A supermarket opening more tills instead of hiring one very fast cashier.

**In the store:**

- On sale day, the order service would run on, say, 10 servers behind a load balancer instead of 1. This only works if any server can handle any request: our API keeps no per-user memory on the server, because the login token travels with every request (`Authorization: Bearer …`, added in `apiSlice.ts`).
- In the queue design (`docs/orders.md`), each worker type scales on its own: add payment workers when orders pile up, leave the email worker alone.
- It also explains a rule in that design: with many servers, two retries of the same order can land on different machines at the same moment, so the idempotency key needs a **unique constraint** in the shared database, not just a check in one server's memory.

**One line:** horizontal scaling is adding more copies of a server, and it works when no single server holds state the others need.

## CDN (Content Delivery Network)

**In my words:** a network of servers around the world that keep copies of files close to users, so a shopper downloads them from a server in their own region instead of one on another continent. It cuts latency for files that are the same for everyone.

**In the store:** `npm run build` produces static files: `index.html`, JavaScript and CSS bundles with a content hash in their names (e.g. `index-a1b2c3.js`), and the category images (`/images/ducks.svg`). Those are the perfect things to serve from a CDN:

- The hashed bundles can be cached "forever", because a code change produces a new file name.
- `index.html` should be cached for a short time only (or revalidated), so users pick up the new bundle names after a deploy.
- The API (`/api/products`, `/api/orders`) is **not** a good fit: answers depend on the user, the filters and live stock. Product **lists** could be cached for a few seconds at most, and orders never.

**One line:** a CDN serves our static files from close to the shopper, while personal and fast-changing data still comes from our API.

## Cache invalidation

**In my words:** deciding when a saved copy of data is out of date and must be thrown away or refreshed. Keep it too long and people see old data; throw it away too often and you lose the speed the cache gave you.

**In the store** (RTK Query, `src/api/apiSlice.ts`):

- **By time:** a list is reused for up to 60 s when you come back to it, and refetched in the background after that (`refetchOnMountOrArgChange: 60`). Unused entries are deleted after 5 minutes.
- **By tags (D3-5):** every product in a cached list is tagged `Product:p-0042`. After an order, `createOrder` **invalidates** the tags of the products that were bought, so every list and details page that shows them refetches and the stock is correct. After a `409 sold out` it invalidates just that product.
- **By updating instead of refetching (D4-4):** a live stock message edits the cached product and every cached list that contains it, found with the same tags (`src/api/liveStock.ts`).
- **On logout:** `resetApiState` empties the whole cache, so the next user never sees the previous user's orders (`useLogout.ts`).

**One line:** cache invalidation is knowing when saved data is stale, and we handle it with time limits, tags after changes, live updates, and clearing everything on logout.

## Eventual consistency

**In my words:** different parts of a system may disagree for a short time, but if no new changes come in, they **all end up agreeing**. "Correct soon", not "correct this exact millisecond".

**In the store:**

- **Order status:** right after checkout the order is `queued`, not `completed`, because the work happens later (in the queue design: stock, payment, email). The confirmation page polls every 2 s until the status catches up (`OrderConfirmationPage.tsx`).
- **Stock on screen:** the stock you see in a cached list can be a few seconds old. Another shopper might buy the last item meanwhile. The live feed (D4-4) narrows the gap, and the server's check at checkout (`409`) is the final word, so being briefly out of date never leads to selling stock we don't have.
- **Two tabs:** the Dev panel switches sync between tabs through the `storage` event (`useLocalStorage.ts`). For a moment the tabs differ, then they agree.

**One line:** eventual consistency means some screens can be slightly behind for a moment, so the UI shows statuses and the server always does the final check.
