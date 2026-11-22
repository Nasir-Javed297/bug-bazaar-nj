// Shows how many items are left. Used on the product card and the details page.

type StockBadgeProps = {
  stock: number;
};

/** Below this number we warn "Only N left". */
const LOW_STOCK_THRESHOLD = 5;

export function StockBadge({ stock }: StockBadgeProps) {
  if (stock <= 0) {
    return <span className="stock-badge stock-badge--out">Out of stock</span>;
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return <span className="stock-badge stock-badge--low">Only {stock} left</span>;
  }
  return <span className="stock-badge stock-badge--in">In stock ({stock})</span>;
}
