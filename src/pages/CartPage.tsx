// Route "/cart": change quantities, remove items, see the total, go to checkout.
// No request here: the cart lives in Redux (saved to localStorage), not on the server.
import { Link } from "react-router-dom";
import { CartLine } from "../components/CartLine";
import { OrderSummary } from "../components/OrderSummary";
import { EmptyState } from "../components/StatusViews";
import { selectCartItems } from "../store/cartSlice";
import { useAppSelector } from "../store/hooks";

export function CartPage() {
  const items = useAppSelector(selectCartItems);

  return (
    <div className="page">
      <h1>Your cart</h1>
      {items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          message="Find something you like and add it to your cart."
          action={
            <Link to="/" className="button">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="cart-layout">
          <ul className="cart-lines">
            {items.map((item) => (
              <CartLine key={item.productId} item={item} />
            ))}
          </ul>
          <OrderSummary>
            <Link to="/checkout" className="button">
              Go to checkout
            </Link>
          </OrderSummary>
        </div>
      )}
    </div>
  );
}
