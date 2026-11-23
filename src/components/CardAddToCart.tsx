// "Add to cart" on a product card in the list. Same rules as the details page's button
// (AddToCartButton): it only dispatches itemAdded, and the cart reducer never goes above stock.
import { itemAdded, selectQuantityInCart } from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { Product } from "../types/api";

type CardAddToCartProps = {
  product: Product;
};

export function CardAddToCart({ product }: CardAddToCartProps) {
  const dispatch = useAppDispatch();
  // Only this product's quantity: adding a different product doesn't re-render this card.
  const inCart = useAppSelector((state) => selectQuantityInCart(state, product.id));

  const soldOut = product.stock <= 0;
  const allInCart = !soldOut && inCart >= product.stock;

  let label = "Add to cart";
  if (soldOut) label = "Sold out";
  else if (allInCart) label = "All in cart";
  else if (inCart > 0) label = "Add another";

  return (
    <div className="product-card__actions">
      {/* role="status": "In your cart (2)" is announced when it changes. Always in the page
          (empty when 0), because a live region must exist BEFORE its text changes. */}
      <p className="product-card__in-cart" role="status">
        {inCart > 0 ? `In your cart (${inCart})` : ""}
      </p>
      <button
        type="button"
        className="product-card__add"
        onClick={() => dispatch(itemAdded({ product }))}
        disabled={soldOut || allInCart}
        // 24 buttons all called "Add to cart" are confusing in a screen reader's list of buttons,
        // so the name adds the product: "Add to cart, Pastel TKL keyboard". It STARTS with the
        // visible words, so voice control ("click Add to cart") still works (WCAG 2.5.3).
        // (A visually hidden <span> was tried first: it produced "Add to cart , Pastel…".)
        aria-label={`${label}, ${product.name}`}
      >
        {label}
      </button>
    </div>
  );
}
