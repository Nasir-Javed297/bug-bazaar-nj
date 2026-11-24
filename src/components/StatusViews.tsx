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

/**
 * Heading level for a state's title. 2 when the page already has an <h1> (e.g. the product list),
 * 1 when the state IS the page's main content (a product page that failed to load), so every
 * page has exactly one <h1> for screen-reader users to jump to.
 */
export type HeadingLevel = 1 | 2;

function StateTitle({ level, children }: { level: HeadingLevel; children: ReactNode }) {
  return level === 1 ? (
    <h1 className="state__title">{children}</h1>
  ) : (
    <h2 className="state__title">{children}</h2>
  );
}

type ErrorStateProps = {
  /** What failed, e.g. "We couldn't load the products". */
  title: string;
  headingLevel?: HeadingLevel;
  error: ClientError;
  onRetry: () => void;
};

export function ErrorState({ title, error, onRetry, headingLevel = 2 }: ErrorStateProps) {
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
      <StateTitle level={headingLevel}>{title}</StateTitle>
      <p className="state__message">{userError.message}</p>
      {action}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  headingLevel?: HeadingLevel;
  message?: string;
  /** Optional button or link, e.g. "Clear filters". */
  action?: ReactNode;
};

export function EmptyState({ title, message, action, headingLevel = 2 }: EmptyStateProps) {
  return (
    <div className="state">
      <span className="state__icon" aria-hidden="true">
        🔍
      </span>
      <StateTitle level={headingLevel}>{title}</StateTitle>
      {message && <p className="state__message">{message}</p>}
      {action}
    </div>
  );
}
