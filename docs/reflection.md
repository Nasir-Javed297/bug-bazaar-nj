# Reflection

An honest look at where I stand after building The Bug Bazaar. I started this week knowing basic JavaScript and React, and almost no TypeScript.

## Ratings (out of 10)

| Topic                         | Rating | What I can do now                                                                                                                                                 | What's still shaky                                                                                                    |
| ----------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| React (state, hooks, effects) | **8**  | Split pages (containers) from components, write custom hooks, clean up effects (timers, listeners, sockets), explain why hooks can't come after an early `return` | When `useMemo` / `React.memo` are worth it without measuring first                                                    |
| Redux Toolkit / RTK Query     | **7**  | Slices, selectors, typed hooks, queries and mutations, cache tags and invalidation, `updateQueryData` for live updates                                            | Thunks and the less common cache options (`keepUnusedDataFor` vs `refetchOnMountOrArgChange`) without looking them up |
| Routing and URL state         | **7**  | Filters in the URL with validation, protected routes with a redirect back, a 404 page, Back-button behaviour (push vs replace)                                    | Nested routes and loaders, which this project didn't need                                                             |
| API errors and UI states      | **7**  | One `RequestState` union, loading / error / empty / success on every page, shopper-friendly messages from `describeError`, retry                                  | Designing the error contract for a brand-new API on my own                                                            |
| Testing                       | **7**  | Integration tests with Testing Library + MSW, querying by role like a user, testing error scenarios with mock switches                                            | Deciding what _not_ to test, and debugging the test environment (the jsdom / Node `fetch` issues took help)           |
| TypeScript                    | **6**  | Read and write unions, type guards, simple generics (`RequestState<T>`), `Pick`, typed props; strict mode doesn't scare me any more                               | Writing generics from scratch; I still check the cheat sheet for syntax like `keyof` and `as const`                   |
| Auth and tokens               | **6**  | Login flow, bearer token on every request, logout on 401, session in `sessionStorage`, and the trade-off against `localStorage` and cookies                       | Refresh tokens and httpOnly cookies, which I've only read about                                                       |
| CI                            | **6**  | A GitHub Actions workflow running typecheck, lint, format, test and build, plus branch protection that blocks a red PR                                            | Writing a workflow from scratch, caching, and reading a failing run's log quickly                                     |
| Performance                   | **6**  | Measure first (render time, frame times), virtualize long lists, memoize where it was proven to help, explain each optimization with a number                     | Reading a React Profiler flame chart on my own                                                                        |
| Accessibility                 | **6**  | Labels, landmarks, a skip link, focus management after navigation and on errors, live regions, Lighthouse 100                                                     | Testing with a real screen reader, and complex widgets (custom dropdowns, dialogs)                                    |
| WebSockets                    | **5**  | Open a socket in an effect, close it on cleanup, subscribe to what's on screen, apply updates to the cache                                                        | **Reconnect and backoff** (gap 1 below)                                                                               |
| System design                 | **5**  | Describe the order queue (`docs/orders.md`) and the glossary terms with examples from this store                                                                  | **Designing a system on my own** (gap 2 below)                                                                        |

## Gap 1: WebSocket reconnect and backoff

**What's hard:** I can see that the stock feed recovers after a disconnect, but I don't fully understand the reconnect logic in `src/api/stockFeed.ts`: why the wait doubles, why it's randomized (jitter), why the counter only resets after 5 seconds of a stable connection, and why `closedByUs` must be set _before_ calling `close()`. AI mistake 6 (`docs/ai-notes.md`) was in exactly this code, and I wouldn't have spotted it myself.

**Next steps (week of 30 Nov 2026):**

1. **Trace it by hand.** On paper, write down the wait for attempts 1 to 7 using `reconnectDelay()` (1 s, 2 s, 4 s … capped at 30 s, then the 50–100% jitter range for each). Then explain in two sentences why every browser retrying at exactly the same moment after a server restart would be bad.
2. **Write the missing unit test.** Add `src/api/stockFeed.test.ts`: replace `Math.random` with a fixed value, and check that `reconnectDelay(1)`, `(2)`, `(3)` and `(10)` give 1,000 / 2,000 / 4,000 / 30,000 ms (times the fixed jitter).
3. **Break it on purpose.** Move the reset of `failedAttempts` back into the `open` handler (the original bug), turn on the Dev panel's **drop connections** switch, and log the gaps between attempts. Watch them stay at about 1 s, then put the fix back and watch them grow. Seeing the bug myself is how I'll remember why the 5-second rule exists.

**Done when:** I can explain the whole reconnect flow in the walkthrough without looking at the code, and the new test passes.

## Gap 2: System design

**What's hard:** in `docs/orders.md` I can follow the order queue design and explain each part, but I couldn't yet design something like it from a blank page. Choosing what goes in the request and what goes on a queue, which order the workers run in, and what happens when each piece fails doesn't come naturally to me yet. Terms like eventual consistency and horizontal scaling (`docs/glossary.md`) make sense with the store's examples, but I haven't used them in a design of my own.

**Next steps (week of 7 Dec 2026):**

1. **Redraw from memory.** Without looking, draw the order flow (order service → queue → inventory → payment → email) and write what happens when each worker is down. Then compare with `docs/orders.md` and note what I missed.
2. **Design one new feature the same way.** Pick "email me when this sold-out product is back in stock" for The Bug Bazaar. Write a one-page design with a diagram: where the sign-up is stored, what event starts the emails, how to avoid emailing someone twice (idempotency again), and what happens if 10,000 people are waiting for the same product.
3. **Read one real-world source per term** for idempotency and queues, for example the Stripe docs on idempotent requests, and add one sentence to `docs/glossary.md` for anything that changes my explanation.
4. **Explain it to someone.** Walk my partner through the back-in-stock design in 10 minutes and write down the questions I couldn't answer. Those are the next things to study.

**Done when:** I can design and defend a small feature (diagram, failure cases, idempotency) without help, and my partner's questions don't catch me out on the basics.

## What went well

- **Every requirement was covered**, as I asked at the start, with a commit per task and a decision recorded for each.
- **Checking instead of trusting.** Each AI mistake in `docs/ai-notes.md` was found by testing the unhappy path or checking claims against the code. That habit is the most useful thing I'm taking from this week.
- **TypeScript went from "can I use JavaScript instead?" to a 6.** The cheat sheet built from this project's own code made the difference.
