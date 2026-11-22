// Catches errors thrown while RENDERING the components inside it, shows a fallback screen
// instead of a blank page, and logs the error (task D4-7).
//
// Error boundaries must be class components: React only offers the two catching methods below
// on classes. They do NOT catch errors in event handlers, timers or promises; those are logged
// by the global handlers in src/monitoring/logger.ts.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { logError } from "../monitoring/logger";
import { ErrorFallback } from "./ErrorFallback";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  /** The reference shown to the user, set once the error is logged. */
  errorId: string | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorId: null };

  /** Runs DURING rendering: only switch to the fallback (must be pure, no side effects). */
  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  /** Runs AFTER: the place for side effects, like logging. */
  componentDidCatch(error: Error, info: ErrorInfo): void {
    const entry = logError(error, "render", { componentStack: info.componentStack ?? undefined });
    this.setState({ errorId: entry.id });
  }

  /** "Try again": render the children again (useful if the problem was temporary). */
  reset = (): void => {
    this.setState({ hasError: false, errorId: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback errorId={this.state.errorId} onReset={this.reset} />;
    }
    return this.props.children;
  }
}
