# Authentication

How login works in The Bug Bazaar, where the token is stored, and why.

## The flow

```
LoginPage ── POST /api/login {email, password} ──▶ 200 { token, user }
    │
    ├─ dispatch(loggedIn({ token, user }))      → state.auth.session   (Redux, in memory)
    │                                              └─ store.subscribe → sessionStorage "bug-bazaar:session"
    └─ navigate(from ?? "/account", { replace: true })   ← back to where the user was

Every request ── base query (src/api/apiSlice.ts) ── adds "Authorization: Bearer <token>"
                                     │
                       401 + a token was sent ──▶ dispatch(loggedOut("expired"))
                                                    ├─ session = null, sessionStorage entry removed
                                                    └─ RequireAuth redirects to /login
                                                       "Your session has expired. Please log in again."
```

| Piece         | File                                        | Job                                                                                           |
| ------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `authSlice`   | `src/store/authSlice.ts`                    | `session: { token, user } \| null` (both or neither), `logoutReason`                          |
| Persistence   | `src/store/authPersistence.ts` + `store.ts` | Load the session from sessionStorage at start-up (validated), save/remove it on change        |
| Base query    | `src/api/apiSlice.ts`                       | Adds the token to every request. A 401 for a request that **sent** a token clears the session |
| `RequireAuth` | `src/components/RequireAuth.tsx`            | Protects `/checkout` and `/account`: logged out → `/login` with `state.from`                  |
| `LoginPage`   | `src/pages/LoginPage.tsx`                   | Form, field errors from a 400, double-submit guard, redirect back                             |
| `useLogout`   | `src/hooks/useLogout.ts`                    | Clears the session **and** the API cache (`resetApiState`), so private data isn't left behind |

## Where the token is stored, and the trade-off

**Decision: Redux (memory) while the app runs, mirrored to `sessionStorage` so a refresh doesn't log the user out.**

| Option                | Survives refresh | Readable by JavaScript (XSS) | Shared across tabs | Verdict                                                                              |
| --------------------- | ---------------- | ---------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| Memory only (Redux)   | ❌               | Only while the page is open  | ❌                 | Safest client-side option, but every refresh logs you out                            |
| **sessionStorage** ✅ | ✅ (same tab)    | Yes                          | ❌                 | **Chosen:** survives refresh, gone when the tab closes                               |
| localStorage          | ✅               | Yes                          | ✅                 | Convenient, but the token stays on the device until removed                          |
| httpOnly cookie       | ✅               | **No**                       | ✅                 | Best protection against XSS, but needs a real server to set it, plus CSRF protection |

**Why sessionStorage:**

- **UX:** a refresh or a bug fix with hot reload doesn't throw the user out mid-checkout.
- **Shorter exposure than localStorage:** the token disappears when the tab is closed, instead of staying on a shared or public computer.
- **Tokens expire anyway** (2 hours in the mock), and an expired token is handled the same way as a revoked one (401 → logged out).

**The trade-off I'm accepting:** any JavaScript running on our page can read sessionStorage. If an attacker managed to inject a script (**XSS**), they could steal the token. That's the main weakness of every option except the httpOnly cookie. Mitigations here: React escapes rendered text by default, we never use `dangerouslySetInnerHTML`, and we have no third-party scripts. Other costs: opening the store in a **new tab** starts logged out (sessionStorage is per tab).

**What I'd do with a real backend:** have the server set the session in an **`httpOnly; Secure; SameSite=Lax` cookie**. JavaScript can't read it at all, which removes token theft by XSS. Because the browser then sends the cookie automatically, the server must also protect state-changing requests against **CSRF** (SameSite cookies plus a CSRF token). The mock can't do this: MSW runs inside the browser, and only a real server can set httpOnly cookies.

## Rules the code enforces

1. **A 401 clears the session.** Handled once, in the base query. The condition "a token was sent" matters: a wrong password on the login form is also a 401, but that should show "Email or password is incorrect", not log anyone out.
2. **The login form can't be double-submitted.** A `useRef` flag is checked at the very start of `handleSubmit`. It updates immediately, unlike state, which only updates on the next render. The button is also disabled ("Logging in…") while the request runs. Verified: two `requestSubmit()` calls in the same instant → **1** login request.
3. **Return to where you were.** `RequireAuth` and the header's Log in link pass `state.from`. After login, `navigate(from, { replace: true })` goes back, and `replace` keeps the login page out of history.
4. **No open redirect.** `from` is only followed if it's a path on this site (`/…`, not `//other-site.com`). See `src/utils/navigation.ts`.
5. **Validated on load.** A tampered or old session in storage fails the `isSession` type guard and is ignored.
6. **Logging out forgets private data.** `resetApiState()` drops cached orders and account data along with the token.

## How to test it

| What                 | How                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Protected routes     | Logged out, open `/checkout` or `/account` → login page → after logging in you're back there       |
| Session expiry (401) | 🛠 Dev tools → **Session expired**, then open `/account` → logged out, "Your session has expired"  |
| Wrong password / 400 | Wrong password → "Email or password is incorrect". Empty fields → per-field errors from the server |
| Refresh              | Log in, refresh → still logged in. Close the tab and reopen → logged out                           |

Demo account: `demo@bugbazaar.dev` / `password123`
