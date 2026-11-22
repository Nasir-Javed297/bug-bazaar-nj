import { Route, Routes } from "react-router-dom";
import { DevPanel } from "./components/DevPanel";
import { Header } from "./components/Header";
import { RequireAuth } from "./components/RequireAuth";
import { config } from "./config";
import { AccountPage } from "./pages/AccountPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFound } from "./pages/NotFound";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import { ProductDetailsPage } from "./pages/ProductDetailsPage";
import { ProductListPage } from "./pages/ProductListPage";

// App only lays out the page: header, routes and dev tools. It holds no data itself:
// server data lives in the RTK Query cache, cart and session in the Redux store,
// and filters in the URL.
export default function App() {
  return (
    <>
      <Header />
      {/* tabIndex={-1}: can receive focus from code (e.g. Back to top) without being a Tab stop. */}
      <main id="main-content" tabIndex={-1}>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {config.enableMocks && <DevPanel />}
    </>
  );
}
