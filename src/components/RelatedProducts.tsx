// "More from this category" on the details page. A small container: it fetches its own data.
// Clicking one of these switches products on the same page, the "switch products quickly" case.
import { useGetProductsQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import type { Product } from "../types/api";
import { ProductGrid } from "./ProductGrid";
import { QueryStateView } from "./QueryStateView";

const RELATED_COUNT = 8;

type RelatedProductsProps = {
  product: Product;
};

export function RelatedProducts({ product }: RelatedProductsProps) {
  // One extra, in case the current product is in the results (it's removed below).
  const result = useGetProductsQuery({
    category: product.category,
    sort: "rating",
    pageSize: RELATED_COUNT + 1,
  });

  return (
    <section className="related" aria-labelledby="related-heading">
      <h2 id="related-heading">More from this category</h2>
      <QueryStateView
        state={toRequestState(result)}
        loadingLabel="Loading related products…"
        errorTitle="We couldn't load related products"
        onRetry={() => void result.refetch()}
      >
        {({ items }) => (
          <ProductGrid
            products={items.filter((item) => item.id !== product.id).slice(0, RELATED_COUNT)}
          />
        )}
      </QueryStateView>
    </section>
  );
}
