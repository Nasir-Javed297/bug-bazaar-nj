// Filtering (task D4-5): the URL <-> filters rules that make refresh and shared links work.
import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, filtersToParams, parseFilters } from "./useProductFilters";

describe("product filters in the URL", () => {
  it("reads every filter from a shared link", () => {
    const filters = parseFilters(
      new URLSearchParams(
        "search=duck&category=ducks&inStock=true&sort=price-asc&page=3&perPage=all",
      ),
    );
    expect(filters).toEqual({
      search: "duck",
      category: "ducks",
      inStock: true,
      sort: "price-asc",
      page: 3,
      perPage: "all",
    });
  });

  it("falls back to safe defaults for values someone typed into the URL by hand", () => {
    const filters = parseFilters(
      new URLSearchParams("category=shoes&sort=cheapest&page=-3&inStock=maybe&perPage=7"),
    );
    expect(filters).toEqual(DEFAULT_FILTERS);
  });

  it("writes short URLs: defaults are left out, so one view has one link", () => {
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe("");
    expect(filtersToParams({ ...DEFAULT_FILTERS, category: "coffee", page: 2 }).toString()).toBe(
      "category=coffee&page=2",
    );
  });
});
