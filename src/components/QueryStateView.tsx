// Picks the right view for a request: loading, error (with retry), not found, empty or success.
// Pages only describe what's different (labels, and what to show with the data),
// so every page handles every state, the same way.
import type { ReactNode } from "react";
import type { ClientError } from "../api/client";
import { describeError } from "../api/errorMessages";
import { NotFoundMessage } from "../pages/NotFound";
import type { RequestState } from "../types/request";
import { EmptyState, ErrorState, LoadingState } from "./StatusViews";

// <T> = the type of the data (a Product, a ProductsResponse...), filled in by each page.
type QueryStateViewProps<T> = {
  state: RequestState<T, ClientError>;
  loadingLabel: string;
  errorTitle: string;
  onRetry: () => void;
  /**
   * For pages about ONE thing (a product, an order): on a 404, show a Not Found view with
   * these words instead of an error. Retrying can't make a missing thing appear.
   */
  notFound?: { title: string; message: string };
  /** Return true when the data counts as "nothing to show". */
  isEmpty?: (data: T) => boolean;
  /** What to show when isEmpty is true. Defaults to a generic empty view. */
  renderEmpty?: (data: T) => ReactNode;
  /** Render prop: only called when there IS data, and receives it already typed. */
  children: (data: T) => ReactNode;
};

export function QueryStateView<T>({
  state,
  loadingLabel,
  errorTitle,
  onRetry,
  notFound,
  isEmpty,
  renderEmpty,
  children,
}: QueryStateViewProps<T>) {
  switch (state.status) {
    case "idle":
    case "loading":
      return <LoadingState label={loadingLabel} />;

    case "error":
      if (notFound && describeError(state.error).kind === "notFound") {
        return <NotFoundMessage title={notFound.title} message={notFound.message} />;
      }
      return <ErrorState title={errorTitle} error={state.error} onRetry={onRetry} />;

    case "success":
      if (isEmpty?.(state.data)) {
        return renderEmpty ? renderEmpty(state.data) : <EmptyState title="Nothing to show" />;
      }
      return children(state.data);
  }
}
