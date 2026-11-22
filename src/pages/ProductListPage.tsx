// Route "/": the product catalogue.
// Container component: reads filters from the URL, fetches matching products and hands the
// request state to QueryStateView, which shows loading / error / empty / success consistently.
import { useGetProductsQuery } from "../api/apiSlice";
import type { ClientError } from "../api/client";
import { toRequestState } from "../api/requestState";
import { BackToTopButton } from "../components/BackToTopButton";
import { FiltersBar } from "../components/FiltersBar";
import { Pagination } from "../components/Pagination";
import { ProductGrid } from "../components/ProductGrid";
import { QueryStateView } from "../components/QueryStateView";
import { EmptyState } from "../components/StatusViews";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useProductFilters } from "../hooks/useProductFilters";
import { DEFAULT_PAGE_SIZE, type ProductsResponse } from "../types/api";
import type { RequestState } from "../types/request";

/** How long typing must pause before searching. Long enough to skip keystrokes, short enough to feel instant. */
const SEARCH_DEBOUNCE_MS = 300;

export function ProductListPage() {
  const { filters, updateFilters, clearFilters, hasActiveFilters } = useProductFilters();

  // The search box (and URL) update on every keystroke; the REQUEST waits until typing pauses.
  // Typing "keyboard" = 1 request instead of 8.
  const debouncedSearch = useDebouncedValue(filters.search.trim(), SEARCH_DEBOUNCE_MS);

  // The filters from the URL ARE the query. A new combination = a new request (and cache entry).
  //
  // Race conditions (task D2-6): replies can arrive in any order. Each reply is cached under
  // ITS OWN query, and `currentData` (read in toRequestState) only returns the entry for the
  // CURRENT query. So a late reply for "d" can never replace the results for "duck".
  const result = useGetProductsQuery({
    search: debouncedSearch,
    category: filters.category,
    sort: filters.sort,
    inStock: filters.inStock,
    page: filters.page,
  });

  // During the debounce pause the box already says "duck" while the last request was for "du".
  // Showing those results would mean showing an old query, so show "Searching…" instead.
  const isTyping = filters.search.trim() !== debouncedSearch;
  const state: RequestState<ProductsResponse, ClientError> = isTyping
    ? { status: "loading" }
    : toRequestState(result);

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
        state={state}
        loadingLabel={isTyping ? "Searching…" : "Loading products…"}
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
      <BackToTopButton />
    </div>
  );
}
