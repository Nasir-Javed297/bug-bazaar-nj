// Route "/": the product catalogue.
// Container component: reads filters from the URL, fetches matching products and hands the
// request state to QueryStateView, which shows loading / error / empty / success consistently.
import { useGetProductsQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import { FiltersBar } from "../components/FiltersBar";
import { Pagination } from "../components/Pagination";
import { ProductGrid } from "../components/ProductGrid";
import { QueryStateView } from "../components/QueryStateView";
import { EmptyState } from "../components/StatusViews";
import { useProductFilters } from "../hooks/useProductFilters";
import { DEFAULT_PAGE_SIZE, type ProductsResponse } from "../types/api";

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

  const goToPage = (page: number) => {
    updateFilters({ page });
    window.scrollTo({ top: 0 });
  };

  /** Two different "nothing here" cases need two different ways out. */
  const renderEmpty = ({ total }: ProductsResponse) =>
    total === 0 ? (
      <EmptyState
        title="No products match your filters"
        message="Try a different search or fewer filters."
        action={
          hasActiveFilters && (
            <button type="button" className="button" onClick={clearFilters}>
              Clear filters
            </button>
          )
        }
      />
    ) : (
      // Matches exist, but not on this page (e.g. someone edited the URL to ?page=999).
      <EmptyState
        title="This page doesn't exist"
        message={`There are ${total} matching products on earlier pages.`}
        action={
          <button type="button" className="button" onClick={() => goToPage(1)}>
            Go to the first page
          </button>
        }
      />
    );

  return (
    <div className="page">
      <h1>Shop developer gear</h1>
      <FiltersBar
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
      <QueryStateView
        state={toRequestState(result)}
        loadingLabel="Loading products…"
        errorTitle="We couldn't load the products"
        onRetry={() => void result.refetch()}
        isEmpty={(data) => data.items.length === 0}
        renderEmpty={renderEmpty}
      >
        {({ items, total }) => (
          <>
            {/* role="status": screen readers announce the new count when filters change. */}
            <p className="result-count" role="status">
              {total} {total === 1 ? "product" : "products"}
            </p>
            <ProductGrid products={items} />
            <Pagination
              page={filters.page}
              totalPages={Math.ceil(total / DEFAULT_PAGE_SIZE)}
              onPageChange={goToPage}
            />
          </>
        )}
      </QueryStateView>
    </div>
  );
}
