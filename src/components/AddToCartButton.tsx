// "Add to cart" for one product. Reads the cart with a selector and changes it ONLY by
// dispatching an action; the cart reducer decides what actually happens (e.g. the stock limit).
import { useState } from "react";
import { itemAdded, selectQuantityInCart } from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { Product } from "../types/api";

type AddToCartButtonProps = {
  product: Product;
};

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const dispatch = useAppDispatch();
  const inCart = useAppSelector((state) => selectQuantityInCart(state, product.id));
  const [justAdded, setJustAdded] = useState(false);

  const soldOut = product.stock <= 0;
  const allInCart = !soldOut && inCart >= product.stock;

  const handleClick = () => {
    dispatch(itemAdded({ product }));
    setJustAdded(true);
  };

  let label = "Add to cart";
  if (soldOut) label = "Out of stock";
  else if (allInCart) label = "All available stock is in your cart";

  return (
    <div className="add-to-cart">
      <button
        type="button"
        className="button"
        onClick={handleClick}
        disabled={soldOut || allInCart}
      >
        {label}
      </button>
      {/* role="status": screen readers announce the confirmation. */}
      <p className="add-to-cart__status" role="status">
        {justAdded && inCart > 0 ? `Added. ${inCart} in your cart.` : ""}
      </p>
    </div>
  );
}
