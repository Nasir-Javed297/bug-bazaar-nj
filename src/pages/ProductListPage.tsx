// Route "/": the product catalogue.
// Container component: fetches data and decides WHAT to show; ProductGrid decides HOW it looks.
// (Filters arrive in D2-2, shared loading/empty/error states in D2-3.)
import type { ReactNode } from "react";
import { useGetProductsQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import { ProductGrid } from "../components/ProductGrid";

export function ProductListPage() {
  const result = useGetProductsQuery({ page: 1 });
  const state = toRequestState(result);

  // ReactNode = "anything React can render" (JSX, text, null...).
  let content: ReactNode;
  switch (state.status) {
    case "idle":
    case "loading":
      content = <p role="status">Loading products…</p>;
      break;
    case "error":
      content = (
        <div role="alert">
          <p>We couldn&apos;t load the products.</p>
          <button type="button" className="button" onClick={() => void result.refetch()}>
            Try again
          </button>
        </div>
      );
      break;
    case "success":
      content = (
        <>
          <p className="result-count">{state.data.total} products</p>
          <ProductGrid products={state.data.items} />
        </>
      );
      break;
  }

  return (
    <div className="page">
      <h1>Shop developer gear</h1>
      {content}
    </div>
  );
}
