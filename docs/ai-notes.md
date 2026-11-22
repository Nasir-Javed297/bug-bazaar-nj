# AI notes

How I used AI (Claude Code) on this project: what I asked, what I kept, what I changed and why. This file is filled in as the work happens and completed in task D5-7.

## AI mistakes and how they were caught

### 1. The Dev panel pulled the whole mock database into the main bundle (D1-2)

- **What happened:** the generated `DevPanel` imported `resetDatabase` from `src/mocks/db.ts`. That file builds 5,000 products as soon as it's loaded, so a static import put the mock database into the main bundle, even though `main.tsx` deliberately loads the mocks with a dynamic `import()`.
- **How it was caught:** comparing bundle sizes after `npm run build` (main bundle 175.5 KB).
- **Fix:** moved the small reset function into `src/mocks/scenarios.ts`. The main bundle dropped to 171.0 KB, and the database now loads only with the mocks.

### 2. A wrong first explanation for the stuck "Loading..." page (D1-4)

- **What happened:** the products page sometimes stayed on "Loading..." even though the server had answered. The AI's first theory was "two copies of react-redux loaded by Vite". It changed the Vite config and cleared the cache, but the bug came back on the next reload. So the theory was wrong: the odd version hashes came from earlier dev-server sessions.
- **How it was caught:** by testing the fix instead of trusting it, then narrowing down step by step: the store state was `rejected` (correct), the Provider held the same store, and dispatching a no-op action made the error appear. So only the notification was delayed. Root cause: RTK's auto-batching uses `requestAnimationFrame`, which is paused in hidden browser tabs (the test pane was hidden).
- **Lesson:** a fix has to be verified by re-running the exact failing scenario. "It worked once" isn't proof.

### 3. Debugging a second copy of the Redux store (D3-1)

- **What happened:** while verifying the cart, the page showed 3 items but the store imported from the browser console was empty. The first explanation ("just a stale hot reload, a full reload fixes it") was wrong: the mismatch survived the reload.
- **How it was caught:** listing the loaded module URLs showed the app used `store.ts?t=1795365900081` (Vite keeps a hot-update timestamp on a file's URL for the whole dev-server session), while the console imported plain `store.ts`, a separate module instance with its own empty store.
- **Lesson:** a test tool can create the very bug it seems to find. Check which instance you're looking at before blaming the app. The app itself always had one store.

### 4. Polling that never stopped on a missing order (D3-2, caught in D3-4)

- **What happened:** the generated order confirmation page polled every 2 s "until the order is completed". Nobody considered the error case: a missing order (404) is never completed, so it polled forever and flickered to "Loading…" every 2 seconds.
- **How it was caught:** while checking every error type for D3-4, one sample showed "Loading your order…" instead of "Order not found". Sampling the screen every 400 ms showed the flicker, and the network list showed repeated 404 requests.
- **Fix:** stop polling when the last request failed. Re-tested with a missing order (1 request, stable screen) and with a real order (still reaches "Confirmed").
- **Lesson:** for every "repeat until X" loop, ask what happens if X never comes.

### 5. A fix applied at the wrong layer (D4-5)

- **What happened:** integration tests showed "We couldn't reach the server". The cause was found correctly (Node's `fetch` rejects jsdom's `AbortSignal`), but the first fix wrapped `fetch` before MSW started. MSW then wrapped `fetch` again, on top, and threw before reaching the fix.
- **How it was caught:** the tests still failed, so instead of trying variations, a probe printed the exact error, which was unchanged. That meant the fix wasn't running at all.
- **Fix:** apply the wrapper after `server.listen()`, so it's the outermost layer. All 30 tests pass.
- **Lesson:** when wrapping functions, order matters: the last wrapper applied is the first one called.

## AI uses (prompt, what I kept, what I changed)

_To be completed in D5-7._

## Something I wouldn't hand to AI

_To be completed in D5-7._
