// Site footer: the store name and links to pages that already exist. No new behaviour:
// the category links are ordinary product-list URLs (the same ones the filters produce).
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <p className="site-footer__title">The Bug Bazaar</p>
          <p>Curated gear for developers. Secure checkout, live stock and easy returns.</p>
        </div>
        <nav aria-label="Shop categories" className="site-footer__column">
          <h2>Shop</h2>
          <ul>
            <li>
              <Link to="/?category=keyboards">Keyboards</Link>
            </li>
            <li>
              <Link to="/?category=ducks">Rubber ducks</Link>
            </li>
            <li>
              <Link to="/?category=coffee">Coffee</Link>
            </li>
            <li>
              <Link to="/?category=stickers">Stickers</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Account" className="site-footer__column">
          <h2>Account</h2>
          <ul>
            <li>
              <Link to="/account">Your account</Link>
            </li>
            <li>
              <Link to="/cart">Cart</Link>
            </li>
          </ul>
        </nav>
        <div className="site-footer__column">
          <h2>Help</h2>
          <ul>
            <li>Shipping over $50 is free</li>
            <li>Returns within 30 days</li>
          </ul>
        </div>
      </div>
      <p className="site-footer__legal">
        © 2026 The Bug Bazaar · Demo store running on a mock API
      </p>
    </footer>
  );
}
