// Route "/": the product catalogue.
// Container component: reads filters from the URL, fetches matching products and picks
// what to show. FiltersBar, ProductGrid and Pagination only display things.
// (Shared loading/empty/error states arrive in D2-3.)
import type { ReactNode } from "react";
import { useGetProductsQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import { FiltersBar } from "../components/FiltersBar";
import { Pagination } from "../components/Pagination";
import { ProductGrid } from "../components/ProductGrid";
import { useProductFilters } from "../hooks/useProductFilters";
import { DEFAULT_PAGE_SIZE } from "../types/api";

export function ProductListPage() {
  const { filters, updateFilters, clearFilters, hasActiveFilters } = useProductFilters();

  // The filters from the URL ARE the query. A new combination = a new request (and cache entry).
  const result = useGetProductsQuery({
    search: filters.search.trim(),
    category: filters.category,
    sort: filters.sort,
    inStock: filters.inStock,
    page: filters.page,
  });
  const state = toRequestState(result);

  const goToPage = (page: number) => {
    updateFilters({ page });
    window.scrollTo({ top: 0 });
  };

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

    case "success": {
      const { items, total } = state.data;
      const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

      if (total === 0) {
        content = (
          <div className="empty">
            <p>No products match your filters.</p>
            {hasActiveFilters && (
              <button type="button" className="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        );
      } else if (items.length === 0) {
        // e.g. someone edited the URL to ?page=999
        content = (
          <div className="empty">
            <p>This page doesn&apos;t exist.</p>
            <button type="button" className="button" onClick={() => goToPage(1)}>
              Go to the first page
            </button>
          </div>
        );
      } else {
        content = (
          <>
            {/* role="status": screen readers announce the new count when filters change. */}
            <p className="result-count" role="status">
              {total} {total === 1 ? "product" : "products"}
            </p>
            <ProductGrid products={items} />
            <Pagination page={filters.page} totalPages={totalPages} onPageChange={goToPage} />
          </>
        );
      }
      break;
    }
  }

  return (
    <div className="page">
      <h1>Shop developer gear</h1>
      <FiltersBar
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
      {content}
    </div>
  );
}
