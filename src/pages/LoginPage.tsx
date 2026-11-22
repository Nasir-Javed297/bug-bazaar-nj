// Route "/login". After logging in, the user returns to where they were (e.g. /checkout).
//
// Double-submit protection (task D3-3), two layers:
// 1. A ref flag, checked first thing in handleSubmit. Refs update IMMEDIATELY, while state
//    (and the disabled button) only updates on the next render.
// 2. The button is disabled and says "Logging in…" while the request runs.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useLoginMutation } from "../api/apiSlice";
import { describeError } from "../api/errorMessages";
import { toClientError } from "../api/requestState";
import { config } from "../config";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { loggedIn, selectIsLoggedIn, selectLogoutReason } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { getFromPath } from "../utils/navigation";

type FieldErrors = { email?: string; password?: string };

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const logoutReason = useAppSelector(selectLogoutReason);
  const [login, { isLoading }] = useLoginMutation();
  useDocumentTitle("Log in");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Changes on every failed attempt, so the error alert is re-created and announced again,
  // even when the text is the same (screen readers don't repeat an unchanged alert).
  const [attempt, setAttempt] = useState(0);
  const isSubmitting = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  // After field errors appear, move focus to the first invalid field: a screen reader then reads
  // its label AND its error (aria-describedby), and the user is where they need to type.
  useEffect(() => {
    if (fieldErrors.email) emailInput.current?.focus();
    else if (fieldErrors.password) passwordInput.current?.focus();
  }, [fieldErrors]);

  // Where to go after logging in. Never back to /login itself.
  const fromPath = getFromPath(location.state);
  const redirectTo = fromPath && !fromPath.startsWith("/login") ? fromPath : "/account";

  // Already logged in (e.g. opened /login directly): nothing to do here.
  if (isLoggedIn) return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) return; // layer 1: a second submit while the first is running
    isSubmitting.current = true;
    setFieldErrors({});
    setFormError(null);

    try {
      const session = await login({ email, password }).unwrap();
      dispatch(loggedIn(session));
      // replace: the login page isn't kept in history, so Back doesn't return to the form.
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      // The shared mapping decides what each error means (src/api/errorMessages.ts).
      const userError = describeError(toClientError(err));
      if (userError.kind === "validation") {
        // The server says which fields are wrong: { email: "…" }. Show each next to its field.
        setFieldErrors({
          email: userError.fieldErrors.email,
          password: userError.fieldErrors.password,
        });
      }
      setFormError(userError.message);
      setAttempt((count) => count + 1);
    } finally {
      isSubmitting.current = false;
    }
  };

  return (
    <div className="page">
      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <h1>Log in</h1>

        {logoutReason === "expired" && !formError && (
          <p className="alert alert--info" role="status">
            Your session has expired. Please log in again.
          </p>
        )}

        {formError && (
          // role="alert": announced immediately by screen readers. key: a fresh alert per attempt.
          <p key={attempt} className="alert alert--error" role="alert">
            {formError}
          </p>
        )}

        <div className="form-field">
          <label htmlFor="login-email">Email</label>
          <input
            ref={emailInput}
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          />
          {fieldErrors.email && (
            <p id="login-email-error" className="form-field__error">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="login-password">Password</label>
          <input
            ref={passwordInput}
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
          />
          {fieldErrors.password && (
            <p id="login-password-error" className="form-field__error">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Layer 2: disabled while the request runs. */}
        <button type="submit" className="button" disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? "Logging in…" : "Log in"}
        </button>

        {config.enableMocks && (
          <p className="auth-form__hint">
            Demo account: <code>demo@bugbazaar.dev</code> / <code>password123</code>
          </p>
        )}
      </form>
    </div>
  );
}
