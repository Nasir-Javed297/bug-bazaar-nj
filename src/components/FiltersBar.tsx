// Search, category, in-stock and sort controls. Presentational: it receives the current
// filters and reports changes; it doesn't know they're stored in the URL.
import type { FormEvent } from "react";
import type { ProductFilters } from "../hooks/useProductFilters";
import {
  CATEGORIES,
  isCategory,
  isSortOption,
  SORT_OPTIONS,
  type Category,
  type SortOption,
} from "../types/api";

const CATEGORY_LABELS: Record<Category, string> = {
  keyboards: "Keyboards",
  ducks: "Rubber ducks",
  coffee: "Coffee",
  stickers: "Stickers",
};

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
  name: "Name: A to Z",
};

type FiltersBarProps = {
  filters: ProductFilters;
  /** `replace: true` = update the current history entry instead of adding a Back-button step. */
  onChange: (changes: Partial<ProductFilters>, options?: { replace?: boolean }) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function FiltersBar({ filters, onChange, onClear, hasActiveFilters }: FiltersBarProps) {
  // Pressing Enter in the search box would submit the form and reload the page.
  const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <form className="filters" role="search" onSubmit={preventSubmit}>
      <div className="filters__field filters__field--search">
        <label htmlFor="filter-search">Search products</label>
        <input
          id="filter-search"
          type="search"
          placeholder="e.g. duck, keyboard…"
          value={filters.search}
          // Starting a new search (box was empty) adds ONE history entry; the following
          // keystrokes replace it. So typing "duck" is one Back step, not four, and the view
          // from before the search is never overwritten.
          onChange={(e) => onChange({ search: e.target.value }, { replace: filters.search !== "" })}
        />
      </div>

      <div className="filters__field">
        <label htmlFor="filter-category">Category</label>
        <select
          id="filter-category"
          value={filters.category ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            onChange({ category: isCategory(value) ? value : undefined });
          }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      <div className="filters__field">
        <label htmlFor="filter-sort">Sort by</label>
        <select
          id="filter-sort"
          value={filters.sort}
          onChange={(e) => {
            const value = e.target.value;
            if (isSortOption(value)) onChange({ sort: value });
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <label className="filters__checkbox">
        <input
          type="checkbox"
          checked={filters.inStock}
          onChange={(e) => onChange({ inStock: e.target.checked })}
        />
        In stock only
      </label>

      {hasActiveFilters && (
        <button type="button" className="button button--secondary" onClick={onClear}>
          Clear filters
        </button>
      )}
    </form>
  );
}
