// Lays out product cards in a responsive grid.
// A real list (<ul>/<li>) so screen readers announce "list, 24 items".
// Very long lists ("All products") are virtualized instead: see VirtualProductGrid (task D4-2).
import type { Product } from "../types/api";
import { ProductCard } from "./ProductCard";
import { VirtualProductGrid } from "./VirtualProductGrid";

/**
 * Above this many items, render only the visible rows. 24 and 96 per page stay a plain list:
 * they're already fast (measured: 96 cards render in ~50 ms), and a plain list is the most
 * accessible (every item is in the page for screen readers and find-in-page).
 */
const VIRTUALIZE_ABOVE = 96;

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length > VIRTUALIZE_ABOVE) {
    return <VirtualProductGrid products={products} />;
  }

  return (
    <ul className="product-grid">
      {products.map((product) => (
        // key: a stable, unique id, so React can tell items apart between renders.
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
