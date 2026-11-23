// Route "/": the product catalogue.
// Container component: reads filters from the URL, fetches matching products and hands the
// request state to QueryStateView, which shows loading / error / empty / success consistently.
// Two modes: 24 or 96 per page (pages + Pagination), or "All products" (infinite loading: 24 at a
// time as the shopper scrolls, in a virtualized grid).
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetProductsFeedInfiniteQuery, useGetProductsQuery } from "../api/apiSlice";
import type { ClientError } from "../api/client";
import { toRequestState } from "../api/requestState";
import { BackToTopButton } from "../components/BackToTopButton";
import { FiltersSidebar, FiltersToolbar } from "../components/FiltersBar";
import { LiveStockStatus } from "../components/LiveStockStatus";
import { LoadMore } from "../components/LoadMore";
import { Pagination } from "../components/Pagination";
import { ProductGrid } from "../components/ProductGrid";
import { QueryStateView } from "../components/QueryStateView";
import { EmptyState } from "../components/StatusViews";
import { VirtualProductGrid } from "../components/VirtualProductGrid";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useLiveStock } from "../hooks/useLiveStock";
import { useProductFilters } from "../hooks/useProductFilters";
import type { ProductsResponse } from "../types/api";
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

  const isAll = filters.perPage === "all";
  const pageSize = filters.perPage === "all" ? 0 : filters.perPage; // "All" mode has no pages
  const productFilters = {
    search: debouncedSearch,
    category: filters.category,
    sort: filters.sort,
    inStock: filters.inStock,
  };

  // The filters from the URL ARE the query. A new combination = a new request (and cache entry).
  //
  // Race conditions (task D2-6): replies can arrive in any order. Each reply is cached under
  // ITS OWN query, and `currentData` (read in toRequestState) only returns the entry for the
  // CURRENT query. So a late reply for "d" can never replace the results for "duck".
  //
  // Both hooks are always called (hooks can't be called conditionally); skipToken tells the one
  // not in use to do nothing, so only one request is ever made.
  const result = useGetProductsQuery(
    isAll ? skipToken : { ...productFilters, page: filters.page, pageSize },
  );
  const feed = useGetProductsFeedInfiniteQuery(isAll ? productFilters : skipToken);

  // The feed's batches, joined into one list. `currentData`: only batches for THESE filters.
  const feedPages = feed.currentData?.pages ?? [];
  const feedData: ProductsResponse | undefined = feed.currentData && {
    items: feedPages.flatMap((page) => page.items),
    total: feedPages[0]?.total ?? 0,
  };
  // An error while products are already shown = loading the NEXT batch failed.
  const loadMoreFailed = feed.isError && feedData !== undefined;

  // During the debounce pause the box already says "duck" while the last request was for "du".
  // Showing those results would mean showing an old query, so show "Searching…" instead.
  const isTyping = filters.search.trim() !== debouncedSearch;
  let state: RequestState<ProductsResponse, ClientError>;
  if (isTyping) {
    state = { status: "loading" };
  } else if (!isAll) {
    state = toRequestState(result);
  } else if (feedData && loadMoreFailed) {
    // Loading the NEXT batch failed: keep the products already shown; LoadMore shows the error.
    state = { status: "success", data: feedData };
  } else {
    // The adapter decides loading / error / success; on success, show the joined batches.
    const feedState = toRequestState(feed);
    state =
      feedState.status === "success"
        ? { status: "success", data: feedData ?? { items: [], total: 0 } }
        : feedState;
  }
  const shownItems = isAll ? feedData?.items : result.currentData?.items;

  // Task D4-4: live stock for the products on screen (only loaded ones: see ProductDetailsPage).
  const liveStatus = useLiveStock(shownItems?.map((product) => product.id) ?? []);

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
            onRetry={() => void (isAll ? feed.refetch() : result.refetch())}
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
                {isAll ? (
                  <>
                    {/* Infinite loading + virtualization: batches of 24 are added as the shopper
                        scrolls, and only the rows near the screen are rendered. */}
                    <VirtualProductGrid products={items} total={total} />
                    <LoadMore
                      loaded={items.length}
                      total={total}
                      hasMore={feed.hasNextPage}
                      isLoading={feed.isFetchingNextPage}
                      isError={loadMoreFailed}
                      onLoadMore={() => void feed.fetchNextPage()}
                    />
                  </>
                ) : (
                  <>
                    <ProductGrid products={items} />
                    <Pagination
                      page={filters.page}
                      totalPages={Math.ceil(total / pageSize)}
                      onPageChange={goToPage}
                    />
                  </>
                )}
              </>
            )}
          </QueryStateView>
        </div>
        <BackToTopButton />
      </div>
    </>
  );
}
