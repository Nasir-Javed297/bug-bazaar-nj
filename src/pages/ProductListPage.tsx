// Route "/": the product catalogue.
// Container component: reads filters from the URL, fetches matching products and hands the
// request state to QueryStateView, which shows loading / error / empty / success consistently.
import { useGetProductsQuery } from "../api/apiSlice";
import type { ClientError } from "../api/client";
import { toRequestState } from "../api/requestState";
import { BackToTopButton } from "../components/BackToTopButton";
import { FiltersSidebar, FiltersToolbar } from "../components/FiltersBar";
import { LiveStockStatus } from "../components/LiveStockStatus";
import { Pagination } from "../components/Pagination";
import { ProductGrid } from "../components/ProductGrid";
import { QueryStateView } from "../components/QueryStateView";
import { EmptyState } from "../components/StatusViews";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useLiveStock } from "../hooks/useLiveStock";
import { useProductFilters } from "../hooks/useProductFilters";
import { MAX_PAGE_SIZE, type ProductsResponse } from "../types/api";
import type { RequestState } from "../types/request";
import { CATEGORY_LABELS } from "../utils/categoryLabels";

/** How long typing must pause before searching. Long enough to skip keystrokes, short enough to feel instant. */
const SEARCH_DEBOUNCE_MS = 300;

export function ProductListPage() {
  const { filters, updateFilters, clearFilters, hasActiveFilters } = useProductFilters();
  useDocumentTitle(filters.search ? `Search: ${filters.search}` : "Shop developer gear");

  // The search box (and URL) update on every keystroke; the REQUEST waits until typing pauses.
  // Typing "keyboard" = 1 request instead of 8.
  const debouncedSearch = useDebouncedValue(filters.search.trim(), SEARCH_DEBOUNCE_MS);

  const pageSize = filters.perPage === "all" ? MAX_PAGE_SIZE : filters.perPage;

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
    pageSize,
  });

  // During the debounce pause the box already says "duck" while the last request was for "du".
  // Showing those results would mean showing an old query, so show "Searching…" instead.
  const isTyping = filters.search.trim() !== debouncedSearch;
  const state: RequestState<ProductsResponse, ClientError> = isTyping
    ? { status: "loading" }
    : toRequestState(result);

  // Task D4-4: live stock for the products on screen (only loaded ones: see ProductDetailsPage).
  const liveStatus = useLiveStock(result.currentData?.items.map((product) => product.id) ?? []);

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

  // The heading names what's shown: "Rubber ducks" when that category is picked.
  const heading = filters.category ? CATEGORY_LABELS[filters.category] : "All products";

  return (
    <>
      <section className="page-hero" aria-labelledby="shop-heading">
        <div className="page-hero__inner">
          <p className="eyebrow">Curated gear for developers</p>
          <h1 id="shop-heading">{heading}</h1>
          <p className="page-hero__lead">
            Keyboards, rubber ducks, coffee and stickers, chosen for long debugging sessions.
          </p>
        </div>
      </section>
      <div className="page shop-layout">
        <FiltersSidebar
          filters={filters}
          onChange={updateFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        <div className="shop-layout__main">
          <FiltersToolbar filters={filters} onChange={updateFilters} />
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
                <div className="result-bar">
                  <p className="result-count" role="status">
                    {total} {total === 1 ? "product" : "products"}
                  </p>
                  <LiveStockStatus status={liveStatus} />
                </div>
                <ProductGrid products={items} />
                <Pagination
                  page={filters.page}
                  totalPages={Math.ceil(total / pageSize)}
                  onPageChange={goToPage}
                />
              </>
            )}
          </QueryStateView>
        </div>
        <BackToTopButton />
      </div>
    </>
  );
}
