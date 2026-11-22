// The ONLY loading, error and empty views in the app, so every page looks and behaves the same.
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { ClientError } from "../api/client";
import { describeError } from "../api/errorMessages";

type LoadingStateProps = {
  /** e.g. "Loading products…" */
  label: string;
};

export function LoadingState({ label }: LoadingStateProps) {
  return (
    // role="status": screen readers announce the text politely.
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p className="state__message">{label}</p>
    </div>
  );
}

type ErrorStateProps = {
  /** What failed, e.g. "We couldn't load the products". */
  title: string;
  error: ClientError;
  onRetry: () => void;
};

export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  // One mapping for every error (src/api/errorMessages.ts). error.message is never shown.
  const userError = describeError(error);
  const location = useLocation();

  // What the user can do next depends on the KIND of error.
  let action: ReactNode = null;
  if (userError.kind === "retryable") {
    action = (
      <button type="button" className="button" onClick={onRetry}>
        Try again
      </button>
    );
  } else if (userError.kind === "unauthorized") {
    // The base query has already signed the user out; come back here after logging in.
    action = (
      <Link
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        className="button"
      >
        Log in
      </Link>
    );
  } else if (userError.kind === "notFound") {
    action = (
      <Link to="/" className="button">
        Back to the shop
      </Link>
    );
  }

  return (
    // role="alert": screen readers announce errors immediately.
    <div className="state state--error" role="alert">
      <span className="state__icon" aria-hidden="true">
        ⚠️
      </span>
      <h2 className="state__title">{title}</h2>
      <p className="state__message">{userError.message}</p>
      {action}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  message?: string;
  /** Optional button or link, e.g. "Clear filters". */
  action?: ReactNode;
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="state">
      <span className="state__icon" aria-hidden="true">
        🔍
      </span>
      <h2 className="state__title">{title}</h2>
      {message && <p className="state__message">{message}</p>}
      {action}
    </div>
  );
}
