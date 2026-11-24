// The product filters live in the URL (?search=duck&category=ducks&page=2), not in useState.
// That single source of truth is what makes refresh, shared links and the Back button work.
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { isCategory, isSortOption, type Category, type SortOption } from "../types/api";

/** How many products per page. "all" shows the whole catalogue (task D4-3: the 5,000-item list). */
export type PerPage = 24 | 96 | "all";
export const PER_PAGE_OPTIONS: readonly PerPage[] = [24, 96, "all"];

export type ProductFilters = {
  search: string;
  /** undefined = all categories */
  category: Category | undefined;
  inStock: boolean;
  sort: SortOption;
  /** 1-based */
  page: number;
  perPage: PerPage;
};

export const DEFAULT_FILTERS: ProductFilters = {
  search: "",
  category: undefined,
  inStock: false,
  sort: "relevance",
  page: 1,
  perPage: 24,
};

/**
 * URL -> filters. URLs can be typed or edited by anyone, so every value is validated:
 * `?category=shoes&page=-3&sort=xyz` falls back to the defaults instead of breaking the page.
 */
export function parseFilters(params: URLSearchParams): ProductFilters {
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "";
  const page = Number(params.get("page"));
  const perPage = params.get("perPage");

  return {
    search: params.get("search") ?? "",
    category: isCategory(category) ? category : undefined,
    inStock: params.get("inStock") === "true",
    sort: isSortOption(sort) ? sort : DEFAULT_FILTERS.sort,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    perPage: perPage === "96" ? 96 : perPage === "all" ? "all" : 24,
  };
}

/** Filters -> URL. Default values are left out, so URLs stay short and identical views share one URL. */
export function filtersToParams(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.inStock) params.set("inStock", "true");
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.perPage !== DEFAULT_FILTERS.perPage) params.set("perPage", String(filters.perPage));
  return params;
}

type UpdateOptions = {
  /** true = replace the current history entry instead of adding one (used while typing). */
  replace?: boolean;
};

export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Recompute only when the URL changes, so `filters` keeps the same identity between renders.
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  /**
   * Change some filters. Partial<ProductFilters> = "any subset of the fields".
   * Any change except an explicit page change goes back to page 1
   * (page 7 of the old results may not exist in the new ones).
   */
  const updateFilters = useCallback(
    (changes: Partial<ProductFilters>, options: UpdateOptions = {}) => {
      const next: ProductFilters = { ...filters, ...changes, page: changes.page ?? 1 };
      setSearchParams(filtersToParams(next), { replace: options.replace ?? false });
    },
    [filters, setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.category !== undefined ||
    filters.inStock ||
    filters.sort !== DEFAULT_FILTERS.sort ||
    filters.perPage !== DEFAULT_FILTERS.perPage;

  return { filters, updateFilters, clearFilters, hasActiveFilters };
}
