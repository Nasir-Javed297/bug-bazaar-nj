// Site header with the cart badge. The badge number is DERIVED from the cart items
// (selectCartCount), never stored separately.
import { Link } from "react-router-dom";
import { selectCartCount } from "../store/cartSlice";
import { useAppSelector } from "../store/hooks";

export function Header() {
  // Re-renders only when the derived count changes.
  const cartCount = useAppSelector(selectCartCount);
  const cartLabel = `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`;

  return (
    <header className="site-header">
      <Link to="/" className="site-title">
        🦆 The Bug Bazaar
      </Link>
      <nav aria-label="Main" className="site-nav">
        {/* aria-label: a screen reader says "Cart, 3 items" instead of "Cart 3". */}
        <Link to="/cart" className="cart-link" aria-label={cartLabel}>
          <span aria-hidden="true">🛒</span> Cart
          {cartCount > 0 && (
            <span className="cart-badge" aria-hidden="true">
              {cartCount}
            </span>
          )}
        </Link>
      </nav>
    </header>
  );
}
