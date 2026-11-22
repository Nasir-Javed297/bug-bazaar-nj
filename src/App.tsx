import { Link, Route, Routes } from "react-router-dom";
import { DevPanel } from "./components/DevPanel";
import { config } from "./config";
import { NotFound } from "./pages/NotFound";
import { ProductDetailsPage } from "./pages/ProductDetailsPage";
import { ProductListPage } from "./pages/ProductListPage";

// App only lays out the page: header, routes and dev tools.
// It holds no data: server data lives in the RTK Query cache (src/api).
export default function App() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="site-title">
          🦆 The Bug Bazaar
        </Link>
      </header>
      {/* tabIndex={-1}: can receive focus from code (e.g. Back to top) without being a Tab stop. */}
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {config.enableMocks && <DevPanel />}
    </>
  );
}
