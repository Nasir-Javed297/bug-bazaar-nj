// Site header: announcement strip, store name, main links, login/account and the cart badge.
// The badge number is DERIVED from the cart items (selectCartCount), never stored separately.
import { Link, NavLink, useLocation } from "react-router-dom";
import { useLogout } from "../hooks/useLogout";
import { selectCurrentUser } from "../store/authSlice";
import { selectCartCount } from "../store/cartSlice";
import { useAppSelector } from "../store/hooks";

/** A shopping bag outline. Decorative: the link's text already says "Cart". */
function BagIcon() {
  return (
    <svg
      className="cart-link__icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 7h12l-1 13H7L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

export function Header() {
  // Re-renders only when the derived count changes.
  const cartCount = useAppSelector(selectCartCount);
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();
  const logout = useLogout();

  return (
    <>
      {/* Static store information. Not a link or a control, so it isn't a Tab stop. */}
      <p className="announcement">
        Complimentary shipping over $50 · Live stock on every product · 30-day returns
      </p>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="site-title">
            The Bug Bazaar
          </Link>
          <nav aria-label="Main" className="site-nav">
            {/* NavLink adds aria-current="page" on the shop page; the CSS underlines it. */}
            <NavLink to="/" end className="nav-link">
              Shop
            </NavLink>
            {user ? (
              <>
                <NavLink to="/account" className="nav-link">
                  Hi, {user.name.split(" ")[0]}
                </NavLink>
                <button type="button" className="nav-button" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              // Remember this page, so logging in brings the user straight back here.
              <NavLink
                to="/login"
                state={{ from: `${location.pathname}${location.search}` }}
                className="nav-link"
              >
                Log in
              </NavLink>
            )}
            {/* Accessible name = what's on screen + a hidden word: "Cart 3 items" (or "Cart 0 items").
                It must CONTAIN the visible text, so voice-control users can say "click Cart 3"
                (WCAG 2.5.3 "Label in Name"). An aria-label like "Cart, 3 items" broke that. */}
            <NavLink to="/cart" className="cart-link">
              <BagIcon /> Cart{" "}
              {cartCount > 0 ? (
                <span className="cart-badge">{cartCount}</span>
              ) : (
                <span className="visually-hidden">0</span>
              )}
              <span className="visually-hidden"> {cartCount === 1 ? "item" : "items"}</span>
            </NavLink>
          </nav>
        </div>
      </header>
    </>
  );
}
