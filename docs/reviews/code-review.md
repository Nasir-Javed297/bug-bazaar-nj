# Code review of my partner's PR (task D5-6)

Reviewer: Nasir-Javed297

PR: [mumairkhan115/Bug-Bazaar-Umair#1](https://github.com/mumairkhan115/Bug-Bazaar-Umair/pull/1) "Merging from dev to main", head commit `a2da2db`, 114 files, +11,835 / −836. **Merged on 22 Nov 2026 with its CI check (`validate`) failing.**

**How I reviewed it:** I read the PR's diff on `dev` and followed each finding through the code (callers, imports, defaults). I ran `npm ci` to reproduce the install. I didn't run their app or tests, so findings 2–4 come from reading the code, and each comment gives the steps to reproduce it.

Labels: **[must fix]** is a bug or a broken check. **[suggestion]** would improve it. **[praise]** is something done well.

## Comments

### 1. [must fix] Correctness: CI fails at `npm ci`, and the PR was merged anyway

`package.json` lines 39 and 41

```json
"eslint": "^10.10.0",
"eslint-plugin-jsx-a11y": "^6.10.2",
```

The lockfile resolves `eslint@10.12.0`, but `eslint-plugin-jsx-a11y@6.10.2` only supports eslint up to `^9`. A clean `npm ci` stops with:

```text
npm error ERESOLVE could not resolve
npm error While resolving: eslint-plugin-jsx-a11y@6.10.2
npm error Found: eslint@10.12.0
npm error Could not resolve dependency:
npm error peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9" from eslint-plugin-jsx-a11y@6.10.2
```

Both `validate` runs on `a2da2db` show **failure**, so none of lint, typecheck, tests or build actually ran in CI for this PR.

**Suggested fix:** use `"eslint": "^9.x"` until jsx-a11y supports 10 (keep the a11y plugin, it's useful), then `npm install` to update the lockfile. Also turn on branch protection for `main` with `validate` as a required check, so a red PR can't be merged. (Small extra: `actions/checkout@v4` and `setup-node@v4` show a Node 20 deprecation warning; `@v5` removes it.)

### 2. [must fix] Correctness: a shared link to page 5 opens page 1 on a desktop screen

`src/features/catalog/CatalogPage.tsx` lines 41–49, with `src/hooks/useUrlFilters.ts` line 56

```ts
const nextSize = screens.lg ? 24 : 12;
if (filters.pageSize !== nextSize) {
  updateFilters({ pageSize: nextSize, page: 1 });
}
```

`parseFilters` defaults `pageSize` to 12 when the URL has no `pageSize`, and `filtersToSearchParams` leaves 12 out of the URL. So on any large screen:

1. Open `/?category=ducks&page=5` (e.g. a link a friend sent from their phone).
2. `pageSize` parses as 12 → the effect sees `lg` wants 24 → `updateFilters({ pageSize: 24, page: 1 })`.
3. The shopper lands on **page 1**, and the first request (page 5 at 12 per page) is wasted.

The same happens when you resize the window across the `lg` breakpoint: you lose your page. This conflicts with the "refresh and Back keep the view" goal in `ARCHITECTURE.md`.

**Suggested fix:** don't put a screen-derived value in the URL. Compute `pageSize` from `screens.lg` when building the query, and keep only `page` in the URL. Or, when the size changes, convert the page so the first visible product stays on screen (`page = Math.floor(((page - 1) * oldSize) / newSize) + 1`) instead of resetting to 1.

### 3. [must fix] Correctness: the product page can show sold-out stock as available

`src/services/api/cache.ts` lines 16–26 and `src/features/catalog/CatalogPage.tsx` lines 77–83

Live updates only go into `CatalogPage`'s local `stockOverlay` state. `ProductPage` reads `getProduct()` through the GET cache, which has no expiry and is cleared only after a **successful** order (`services/api/orders.ts` line 26), not after a 409.

Steps: open a product (its stock, say 5, is cached), go back, watch the live feed take it to 0, open the product again. It still says "5 in stock" and **Add to cart** is enabled. Checkout's 409 catches it in the end, but only after the shopper was shown something false.

**Suggested fix:** let stock updates patch the cached entries (`/api/products/:id` and cached lists), run the feed on `ProductPage` too, clear the sold-out product on a 409, and/or give product entries a short expiry. (More detail in my architecture review.)

### 4. [must fix] Correctness: the "Error Simulation" control is shipped to shoppers and lives in shareable links

`src/features/catalog/FiltersBar.tsx` lines 142–164, `src/features/catalog/CatalogPage.tsx` lines 52–57, `src/domain/api.ts` line 52

The fault picker is a normal filter. It shows in every build (no `import.meta.env.DEV` check), it adds `?fault=500` to the URL, and it counts toward the Filters badge. So:

- Anyone who opens a link containing `?fault=500` sees the catalog fail, with no hint why except a setting inside the Filters drawer.
- The fault works by sending a **magic search string** (`search = '__error_500'`) that `handleApi` special-cases. That couples test hooks to the real search contract: against a real backend this does nothing, or searches for "\_\_error_500".

**Suggested fix:** show the control only when `import.meta.env.DEV` is true (or mocks are enabled), keep it out of `UrlFilters` (e.g. in `localStorage` or a dev-only panel), and send it as a separate mock-only header such as `X-Mock-Fault: 500` that the real API never sees.

### 5. [suggestion] Readability: both sides of this ternary are the same

`src/features/checkout/CheckoutPage.tsx` line 41

```ts
setMessage(error instanceof ApiRequestError ? friendlyMessage(error) : friendlyMessage(error));
```

Both branches call the same thing, so the check does nothing and makes the reader look for a difference that isn't there. `setMessage(friendlyMessage(error));` says the same.

While here: on a 409 the message is shown but the cart keeps the old quantity, so pressing **Place order** again just gets the same 409. Dispatching the existing `syncStock` with the `available` amount from the error would fix the cart in one step.

### 6. [suggestion] Accessibility: no page has an `<h1>`, and the heading levels jump

`CheckoutPage.tsx` line 57, `LoginPage.tsx` line 69, `AccountPage.tsx` line 60, `OrderPage.tsx` line 53 (`level={3}`), `ProductPage.tsx` line 99 (`level={2}`), and `CatalogPage` has no heading at all.

Screen-reader users often jump straight to the `<h1>` to find out where they are, and navigate by heading level. Here every page starts at h2 or h3, so there's no main heading, and the structure suggests levels that don't exist (WCAG 1.3.1 and 2.4.6; Lighthouse flags it as "Heading elements are not in a sequentially-descending order").

**Suggested fix:** one `Typography.Title level={1}` per page (Checkout, Sign in, Account, Order …, the product name, and a "Products" heading on the catalog, visually hidden if the design doesn't want it), with sections below it at level 2. CSS can keep the current sizes.

### 7. [suggestion] Accessibility: result counts and the stock feed status change silently

`src/features/catalog/FiltersBar.tsx` line 97 and `src/features/catalog/CatalogPage.tsx` line 117

```tsx
<Typography.Paragraph ...>{total} products match</Typography.Paragraph>
```

After typing a search or changing a filter, a sighted user sees the count change. A screen-reader user hears nothing and has to go looking. Same for "Stock feed: reconnecting".

**Suggested fix:** add `role="status"` (a polite live region) to both paragraphs, so the new text is read out when it changes without interrupting. Showing "connecting / live / reconnecting" as words a shopper understands (e.g. "Live stock paused, reconnecting…") would also help everyone.

### 8. [suggestion] Accessibility: focus stays on the button after a failed sign-in

`src/features/auth/LoginPage.tsx` lines 72–76

When the form has an error (empty email, wrong password), the message appears, but keyboard and screen-reader users are left on the **Sign in** button and have to tab back to find what's wrong.

**Suggested fix:** pass `scrollToFirstError={{ focus: true }}` to `<Form>` so the first invalid field gets focus. For the 401 case, keep `role="alert"` on the error (Ant Design's `Alert` already has it) and move focus to the email field.

### 9. [suggestion] Readability: the PR has no description

Title "Merging from dev to main", empty body, 114 files. A reviewer (or the evaluator) has no list of what's included, how to run it, or how to try the error states. A short description helps: a summary per day, how to run it, the demo account, how to trigger each error, and known gaps (like comment 1).

## Praise

### 10. [praise] One pure function owns the whole API contract

`src/domain/api.ts` (`handleApi`) and `src/domain/behavior.test.ts`

Every status code is decided in one pure function. The Vite middleware only translates HTTP, and the tests call `handleApi` directly with no server or network, so the 401/404/409/500 cases run in milliseconds. Nothing in `src/` outside the tests imports it, so React can't come to depend on the mock. This is a cleaner split than mine, and I'd reuse it.

### 11. [praise] Checkout can't create two orders

`src/features/checkout/CheckoutPage.tsx` lines 22–30 and `src/domain/orders.ts` lines 29 and 78

The idempotency key is created once per checkout (`useRef(crypto.randomUUID())`) and sent with every retry, the server maps key → order and returns the original order for a repeated key, and the `submitting` guard plus the disabled button stop double clicks. A lost reply followed by a retry can't charge twice. Rejecting an empty key with a 400 (line 37) is a nice extra.

### 12. [praise] The login form is careful with details

`src/features/auth/LoginPage.tsx`

The form uses `autoComplete="email"` / `"current-password"` so password managers work, shows different messages for wrong credentials (401) and server problems, maps 400 field errors straight onto the right inputs with `form.setFields`, and validates `location.state.from` before redirecting. All the small things that are easy to forget.

## Summary

| #     | Area                                                     | Type       |
| ----- | -------------------------------------------------------- | ---------- |
| 1     | Correctness: CI fails at `npm ci`, merged while red      | must fix   |
| 2     | Correctness: page reset to 1 on desktop                  | must fix   |
| 3     | Correctness: stale stock on the product page             | must fix   |
| 4     | Correctness: dev fault control in production + URL       | must fix   |
| 5     | Readability: identical ternary; 409 doesn't fix the cart | suggestion |
| 6     | Accessibility: no `<h1>`, heading levels skip            | suggestion |
| 7     | Accessibility: counts and feed status not announced      | suggestion |
| 8     | Accessibility: no focus on the first invalid field       | suggestion |
| 9     | Readability: empty PR description                        | suggestion |
| 10–12 | Contract design, idempotent checkout, login details      | praise     |

Since the PR is already merged, these can be posted on it as review comments, and the fixes can go in a follow-up PR.

## Comments on my own PR

On 23 Nov 2026 my PR [Nasir-Javed297/bug-bazaar-nj#1](https://github.com/Nasir-Javed297/bug-bazaar-nj/pull/1) had no comments or reviews yet. My replies to my partner's comments will be added here when they arrive.
