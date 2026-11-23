// The product filters, in two parts that sit in different places on the page:
// - FiltersSidebar (left column): category and availability, plus Clear filters
// - FiltersToolbar (above the grid): search, sort and how many to show
// Presentational: they receive the current filters and report changes; they don't know the
// filters are stored in the URL.
import type { FormEvent } from "react";
import { PER_PAGE_OPTIONS, type PerPage, type ProductFilters } from "../hooks/useProductFilters";
import {
  CATEGORIES,
  isSortOption,
  SORT_OPTIONS,
  type Category,
  type SortOption,
} from "../types/api";
import { CATEGORY_LABELS } from "../utils/categoryLabels";

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
  name: "Name: A to Z",
};

type FilterChange = (
  changes: Partial<ProductFilters>,
  /** `replace: true` = update the current history entry instead of adding a Back-button step. */
  options?: { replace?: boolean },
) => void;

type FiltersSidebarProps = {
  filters: ProductFilters;
  onChange: FilterChange;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function FiltersSidebar({
  filters,
  onChange,
  onClear,
  hasActiveFilters,
}: FiltersSidebarProps) {
  // One option per category, plus "All categories" (no category in the URL).
  const categoryOptions: { value: Category | undefined; label: string }[] = [
    { value: undefined, label: "All categories" },
    ...CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] })),
  ];

  return (
    <section className="filters-sidebar" aria-label="Filters">
      {/* A fieldset + legend groups the radio buttons: screen readers announce "Category, group". */}
      <fieldset className="filter-group">
        <legend className="filter-group__title">Category</legend>
        {categoryOptions.map(({ value, label }) => (
          <label key={label} className="filter-option">
            <input
              type="radio"
              name="category"
              value={value ?? ""}
              checked={filters.category === value}
              onChange={() => onChange({ category: value })}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="filter-group">
        <legend className="filter-group__title">Availability</legend>
        <label className="filter-option filter-option--checkbox">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => onChange({ inStock: e.target.checked })}
          />
          <span>In stock only</span>
        </label>
      </fieldset>

      {hasActiveFilters && (
        <button type="button" className="text-button" onClick={onClear}>
          Clear filters
        </button>
      )}
    </section>
  );
}

type FiltersToolbarProps = {
  filters: ProductFilters;
  onChange: FilterChange;
};

export function FiltersToolbar({ filters, onChange }: FiltersToolbarProps) {
  // Pressing Enter in the search box would submit the form and reload the page.
  const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <form className="toolbar" role="search" onSubmit={preventSubmit}>
      <div className="toolbar__search">
        {/* Visually hidden: the magnifier icon and placeholder say what the box is for. */}
        <label htmlFor="filter-search" className="visually-hidden">
          Search products
        </label>
        <svg
          className="toolbar__search-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          id="filter-search"
          type="search"
          placeholder="Search ducks, keyboards, coffee…"
          value={filters.search}
          // Starting a new search (box was empty) adds ONE history entry; the following
          // keystrokes replace it. So typing "duck" is one Back step, not four, and the view
          // from before the search is never overwritten.
          onChange={(e) => onChange({ search: e.target.value }, { replace: filters.search !== "" })}
        />
      </div>

      <div className="toolbar__select">
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

      <div className="toolbar__select">
        <label htmlFor="filter-per-page">Show</label>
        <select
          id="filter-per-page"
          value={String(filters.perPage)}
          onChange={(e) => {
            const value = PER_PAGE_OPTIONS.find((option) => String(option) === e.target.value);
            if (value !== undefined) onChange({ perPage: value satisfies PerPage });
          }}
        >
          {PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={String(option)}>
              {option === "all" ? "All products" : `${option} per page`}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
