import { useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { DevPanel } from "./components/DevPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { RequireAuth } from "./components/RequireAuth";
import { config } from "./config";
import { AccountPage } from "./pages/AccountPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CrashTestPage } from "./pages/CrashTestPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFound } from "./pages/NotFound";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import { ProductDetailsPage } from "./pages/ProductDetailsPage";
import { ProductListPage } from "./pages/ProductListPage";

// App only lays out the page: header, routes and dev tools. It holds no data itself:
// server data lives in the RTK Query cache, cart and session in the Redux store,
// and filters in the URL.
export default function App() {
  const location = useLocation();

  // Task D4-1: after navigating to another PAGE, move keyboard focus to the main content.
  // Without this, a single-page app changes the screen silently: focus stays on the old link
  // and screen readers announce nothing. Only the path counts: changing a filter (?search=…)
  // must not pull focus away from the search box being typed in. The ref skips the first
  // render (and React's StrictMode re-run), so the initial page load doesn't move focus.
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <>
      {/* First Tab stop on every page: lets keyboard users jump past the header. */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      {/* tabIndex={-1}: can receive focus from code (e.g. Back to top) without being a Tab stop. */}
      <main id="main-content" tabIndex={-1}>
        {/* Task D4-7: a page that crashes shows a fallback HERE, so the header keeps working.
            key = path: navigating to another page starts a fresh boundary (the error is left behind). */}
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<ProductListPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/login" element={<LoginPage />} />
            {/* Protected routes: logged-out users are sent to /login and brought back after. */}
            <Route
              path="/checkout"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <RequireAuth>
                  <OrderConfirmationPage />
                </RequireAuth>
              }
            />
            {config.enableMocks && <Route path="/dev/crash" element={<CrashTestPage />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      {config.enableMocks && <DevPanel />}
    </>
  );
}
