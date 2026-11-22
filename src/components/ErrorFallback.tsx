// The screen shown by ErrorBoundary when a page crashes (task D4-7).
type ErrorFallbackProps = {
  errorId: string | null;
  onReset: () => void;
};

/** Deliberately simple: no router, no Redux, no data. A fallback must not be able to crash. */
export function ErrorFallback({ errorId, onReset }: ErrorFallbackProps) {
  return (
    <div className="page">
      <div className="state state--error" role="alert">
        <span className="state__icon" aria-hidden="true">
          🐛
        </span>
        <h1 className="state__title">Something went wrong</h1>
        <p className="state__message">
          Sorry, this page hit an unexpected problem. It has been reported, and the rest of the
          store still works.
        </p>
        {errorId && (
          <p className="state__message">
            Error reference: <code>{errorId}</code>
          </p>
        )}
        <div className="state__actions">
          <button type="button" className="button" onClick={onReset}>
            Try again
          </button>
          {/* A full page load: the safest way back if something in memory is broken. */}
          <a href="/" className="button button--secondary">
            Go to the home page
          </a>
        </div>
      </div>
    </div>
  );
}
