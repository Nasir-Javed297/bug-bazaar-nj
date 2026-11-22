// Item count and total, shown on the cart and checkout pages. Both values are DERIVED
// from the cart items by memoized selectors (task D3-1).
import type { ReactNode } from "react";
import { selectCartCount, selectCartTotal } from "../store/cartSlice";
import { useAppSelector } from "../store/hooks";
import { formatPrice } from "../utils/formatPrice";

type OrderSummaryProps = {
  /** A button or link under the total, e.g. "Go to checkout". */
  children?: ReactNode;
};

export function OrderSummary({ children }: OrderSummaryProps) {
  const count = useAppSelector(selectCartCount);
  const total = useAppSelector(selectCartTotal);

  return (
    <aside className="order-summary" aria-labelledby="order-summary-heading">
      <h2 id="order-summary-heading">Order summary</h2>
      <p>
        {count} {count === 1 ? "item" : "items"}
      </p>
      <p className="order-summary__total">
        Total: <strong>{formatPrice(total)}</strong>
      </p>
      {children}
    </aside>
  );
}
