// Route "/products/:id": one product's details.
// Loading/error states come from QueryStateView. Cleanup (task D2-4): the request is cancelled
// when the user leaves the product, and Back to Top removes its listener when the page closes.
import { useEffect } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Link, useLocation, useParams } from "react-router-dom";
import { useGetProductQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import { AddToCartButton } from "../components/AddToCartButton";
import { BackToTopButton } from "../components/BackToTopButton";
import { QueryStateView } from "../components/QueryStateView";
import { RelatedProducts } from "../components/RelatedProducts";
import { StockBadge } from "../components/StockBadge";
import { useCancelProductRequestOnLeave } from "../hooks/useCancelProductRequestOnLeave";
import { formatPrice } from "../utils/formatPrice";
import { getFromPath } from "../utils/navigation";
import { NotFound } from "./NotFound";

export function ProductDetailsPage() {
  // The `:id` part of the URL. Typed `string | undefined`: the router can't promise it exists.
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  // ProductCard passes { from: "/?category=ducks..." }, so Back returns to the same filtered list.
  // Opened from a shared link there's no state, so fall back to the product list.
  const backLink = getFromPath(location.state) ?? "/";
  // Opened from a related product? Then "back" goes to that product, not the list.
  const backLabel = backLink.startsWith("/products/")
    ? "Back to previous product"
    : "Back to products";

  // skipToken = "don't fetch". Avoids requesting /api/products/undefined.
  const result = useGetProductQuery(id ?? skipToken);
  const state = toRequestState(result);

  // Task D2-4: leaving this product (switching or closing the page) cancels its request.
  useCancelProductRequestOnLeave(id);

  // The router keeps the scroll position, so a product opened from "More from this category"
  // (at the bottom) would start scrolled down. Jump to the top whenever the product changes.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  // Note: every hook is called above this line. Hooks must run in the same order on every
  // render, so they can't come after an early `return`.

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
        ← {backLabel}
      </Link>
      <QueryStateView
        state={state}
        loadingLabel="Loading product…"
        errorTitle="We couldn't load this product"
        onRetry={() => void result.refetch()}
      >
        {(product) => (
          <>
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
                {/* key: a new product gets a fresh button (its "Added" message resets). */}
                <AddToCartButton key={product.id} product={product} />
              </div>
            </article>
            <RelatedProducts product={product} />
          </>
        )}
      </QueryStateView>
      <BackToTopButton />
    </div>
  );
}
