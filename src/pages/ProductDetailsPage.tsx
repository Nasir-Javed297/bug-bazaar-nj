// Route "/products/:id": one product's details.
// Loading/error states come from QueryStateView. (Request cleanup and Back to Top: D2-4.)
import { skipToken } from "@reduxjs/toolkit/query";
import { Link, useLocation, useParams } from "react-router-dom";
import { useGetProductQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import { QueryStateView } from "../components/QueryStateView";
import { StockBadge } from "../components/StockBadge";
import { formatPrice } from "../utils/formatPrice";
import { NotFound } from "./NotFound";

/**
 * Where "Back to products" should go. ProductCard passes `{ from: "/?category=ducks..." }`
 * as navigation state, so the user returns to the same filtered list. Navigation state can be
 * anything (or missing, e.g. when the page was opened from a shared link), so we check it.
 */
function getBackLink(state: unknown): string {
  if (
    typeof state === "object" &&
    state !== null &&
    "from" in state &&
    typeof state.from === "string" &&
    state.from.startsWith("/")
  ) {
    return state.from;
  }
  return "/";
}

export function ProductDetailsPage() {
  // The `:id` part of the URL. Typed `string | undefined`: the router can't promise it exists.
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const backLink = getBackLink(location.state);

  // skipToken = "don't fetch". Avoids requesting /api/products/undefined.
  const result = useGetProductQuery(id ?? skipToken);
  const state = toRequestState(result);

  // A missing product isn't fixed by retrying, so a 404 gets the Not Found page instead.
  if (state.status === "error" && state.error.status === 404) {
    return (
      <NotFound
        title="Product not found"
        message="This product doesn't exist or is no longer available."
      />
    );
  }

  return (
    <div className="page">
      <Link to={backLink} className="back-link">
        ← Back to products
      </Link>
      <QueryStateView
        state={state}
        loadingLabel="Loading product…"
        errorTitle="We couldn't load this product"
        onRetry={() => void result.refetch()}
      >
        {(product) => (
          <article className="product-details">
            <img
              className="product-details__image"
              src={product.imageUrl}
              alt={product.name}
              width={320}
              height={240}
            />
            <div className="product-details__info">
              <p className="product-details__category">{product.category}</p>
              <h1>{product.name}</h1>
              <p className="product-details__price">{formatPrice(product.price)}</p>
              <p aria-label={`Rated ${product.rating} out of 5`}>
                ★ {product.rating.toFixed(1)} / 5
              </p>
              <StockBadge stock={product.stock} />
            </div>
          </article>
        )}
      </QueryStateView>
    </div>
  );
}
