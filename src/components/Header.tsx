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
        {/* Accessible name = what's on screen + a hidden word: "Cart 3 items" (or "Cart 0 items").
            It must CONTAIN the visible text, so voice-control users can say "click Cart 3"
            (WCAG 2.5.3 "Label in Name"). An aria-label like "Cart, 3 items" broke that. */}
        <Link to="/cart" className="cart-link">
          <span aria-hidden="true">🛒</span> Cart{" "}
          {cartCount > 0 ? (
            <span className="cart-badge">{cartCount}</span>
          ) : (
            <span className="visually-hidden">0</span>
          )}
          <span className="visually-hidden"> {cartCount === 1 ? "item" : "items"}</span>
        </Link>
      </nav>
    </header>
  );
}
