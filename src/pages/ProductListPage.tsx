// TEMPORARY list that proves the data layer works end to end (task D1-4).
// Replaced by the real product grid, filters and shared UI states in Day 2.
import { useGetProductsQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";

export function ProductListPage() {
  // The component asks for data; it never knows HOW it is fetched (no fetch, no URLs).
  const result = useGetProductsQuery({ page: 1 });
  const state = toRequestState(result);

  switch (state.status) {
    case "idle":
    case "loading":
      return <p role="status">Loading products…</p>;

    case "error":
      return (
        <div role="alert">
          <p>We couldn&apos;t load the products.</p>
          <button type="button" onClick={() => void result.refetch()}>
            Try again
          </button>
        </div>
      );

    case "success":
      return (
        <section className="main-wrapper">
          <h1>Products</h1>
          <p>{state.data.total} products in the catalogue. Showing the first page:</p>
          <ul>
            {state.data.items.map((product) => (
              <li key={product.id}>
                {product.name}: {product.price} cents, {product.stock} in stock
              </li>
            ))}
          </ul>
        </section>
      );
  }
}
