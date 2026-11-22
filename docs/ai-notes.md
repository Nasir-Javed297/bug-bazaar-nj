# AI notes

How I used AI (Claude Code) on this project: what I asked, what I kept, what I changed and why. Filled in as the work happened and completed in task D5-7.

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

### 6. Reconnect backoff that never backed off (D4-4)

- **What happened:** the generated WebSocket client reset its retry counter as soon as a connection opened. A server that accepts connections and drops them straight away (overloaded or crash-looping) would get a reconnect every ~1 s from every browser, which is exactly what backoff exists to prevent.
- **How it was caught:** testing recovery with the Dev panel's _drop connections_ switch and logging when each attempt started: the gaps were 1.5, 1.1, 1.4, 1.4, 1.0 s instead of growing.
- **Fix:** reset the counter only after a connection has stayed open for 5 s. Re-tested: 1.4 → 2.0 → 3.7 → 7.0 → 14.8 s.
- **Lesson:** test the unhappy path with numbers, not just "it reconnected". Both versions "reconnected".

### 7. Architecture doc claims that didn't match the code (D5-1)

- **What happened:** the first draft of `docs/ARCHITECTURE.md` said a repeated idempotency key returns `200` (it returns `201` with the same order), that `useLocalStorage` saves whether the Dev panel is open (it only saves the Dev panel switches), and that a missing `switch` case in `QueryStateView` fails the build (it only does where the function declares a return type, like `checkoutMessage`).
- **How it was caught:** every sentence that named a file, setting or status code was checked against the source with `grep` before committing.
- **Lesson:** AI writes docs that sound right. "Sounds right" is how a doc ends up describing code that doesn't exist, so a doc gets the same checking as code.

## AI uses (prompt, what I kept, what I changed)

I used Claude Code as a pair programmer and teacher for the whole project. My standing instructions were: explain before each change, walk through the code after, verify every state (loading, error, empty, validation), and don't build anything until I ask. Three uses that show how that worked:

### Use 1: Turning the spec into a plan (start of the project)

- **Prompt (summarized):** I gave it the Bug Bazaar PDF and the evaluator's message and asked it to review the requirements, break them into tasks, explain the app flow, and make a step-by-step plan, ending with "dont start build anything unless i ask to do."
- **What I kept:** the task breakdown by ID (D1-1 … D5-9), the "order matters" rules (e.g. D1-3 TypeScript before everything, D3-3 logout-on-401 before D3-4 error states, D4-5 tests before D4-6 CI), and the rhythm of one task per step with a commit per task.
- **What I changed, and why:** the first plan suggested cutting or shortening work to fit the deadline. I asked it to compress the explanation, then to change the plan, and told it: _"i just want to make sure that nothing will be skip just for the sake of short time… cover every requirement."_ The plan was rewritten so every task stays in, at a learning pace. I'd rather finish late at night than hand in a project with silent gaps.

### Use 2: Learning TypeScript through a cheat sheet built from my own code (D1-3)

- **Prompt:** _"is there any specific requirement that i should use reactJS with typescript? cant i use react with javascript? since i am beginner in typescript and its syntax. its difficult for me to understand"_, then _"Yes, add cheat sheet"_.
- **What I kept:** the answer that TypeScript is required by the spec (so switching to JavaScript wasn't an option), and [`docs/typescript-cheatsheet.md`](typescript-cheatsheet.md), which explains each pattern with an example taken from this project (union types, type guards, generics like `RequestState<T>`, `Pick`, `as const`…) instead of textbook examples.
- **What I changed, and why:** I asked for the types to stay simple and for every new piece of syntax to point to its cheat-sheet section when it first appears in the code. Strict TypeScript with clever types I can't read would pass CI but fail the walkthrough. The cheat sheet grew with the project (now 22 sections) as new syntax appeared.

### Use 3: Reviewing my partner's architecture and PR (D5-5, D5-6)

- **Prompt:** I shared the link to my partner's `ARCHITECTURE.md` and then their PR, and asked for help drafting the reviews (2 strengths, 2 risks, 1 recommendation, and 5+ PR comments covering correctness, readability, accessibility and praise).
- **What I kept:** the findings that were traced through their code with a file, line and steps to reproduce: CI failing at `npm ci` (reproduced), the page reset to 1 on desktop, stale stock on the product page, the error-simulation control in production, and the missing `<h1>`s. Also the praise, which is specific (their pure `handleApi` contract is cleaner than my design).
- **What I changed, and why:**
  - Two cited line numbers were wrong in the first draft, and were fixed after checking.
  - Their app and tests weren't run (installing their packages was blocked by a permission check), so the review says plainly which findings come from reading code. A review that claims "I tested this" when it wasn't tested would be dishonest, and my partner would find out.
  - Nothing is posted automatically. The comments go out under my name, so I read each one and post it myself.

## Something I wouldn't hand to AI

**Deciding that work is finished and correct, and putting my name on it.**

AI can write the code, the tests and the docs, and it can be confidently wrong in all three (see mistakes 2, 4, 6 and 7 above: each one "worked" or "sounded right" until it was checked). So the final call stays with me:

- **Marking a PR "Ready for review" or merging it.** My partner's PR was merged while its CI was red. That's exactly the decision that needs a person who has looked at the result, not a tool that says "done".
- **Anything sent under my name:** review comments on my partner's PR, and replies to comments on mine.
- **My self-assessment** in `reflection.md`: how well I understand each topic is something only I know. An AI-written rating would make the evaluator's job (finding my real gaps) impossible.

In practice: AI proposes, I verify it against the running app or the code, and I only commit or send what I can explain in my own words.
