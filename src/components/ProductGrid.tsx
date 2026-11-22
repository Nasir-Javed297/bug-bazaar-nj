// Lays out product cards in a responsive grid.
// A real list (<ul>/<li>) so screen readers announce "list, 24 items".
import type { Product } from "../types/api";
import { ProductCard } from "./ProductCard";

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
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
