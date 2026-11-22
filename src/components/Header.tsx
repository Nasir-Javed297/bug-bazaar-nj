// Site header: cart badge and login/account links.
// The badge number is DERIVED from the cart items (selectCartCount), never stored separately.
import { Link, useLocation } from "react-router-dom";
import { useLogout } from "../hooks/useLogout";
import { selectCurrentUser } from "../store/authSlice";
import { selectCartCount } from "../store/cartSlice";
import { useAppSelector } from "../store/hooks";

export function Header() {
  // Re-renders only when the derived count changes.
  const cartCount = useAppSelector(selectCartCount);
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();
  const logout = useLogout();
  const cartLabel = `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`;

  return (
    <header className="site-header">
      <Link to="/" className="site-title">
        🦆 The Bug Bazaar
      </Link>
      <nav aria-label="Main" className="site-nav">
        {user ? (
          <>
            <Link to="/account" className="nav-link">
              Hi, {user.name.split(" ")[0]}
            </Link>
            <button type="button" className="nav-button" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          // Remember this page, so logging in brings the user straight back here.
          <Link
            to="/login"
            state={{ from: `${location.pathname}${location.search}` }}
            className="nav-link"
          >
            Log in
          </Link>
        )}
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
