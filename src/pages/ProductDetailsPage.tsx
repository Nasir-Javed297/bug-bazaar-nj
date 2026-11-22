// Route "/products/:id": one product's details.
// (Shared UI states arrive in D2-3, request cleanup and Back to Top in D2-4.)
import type { ReactNode } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Link, useParams } from "react-router-dom";
import { useGetProductQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import { StockBadge } from "../components/StockBadge";
import { formatPrice } from "../utils/formatPrice";
import { NotFound } from "./NotFound";

export function ProductDetailsPage() {
  // The `:id` part of the URL. Typed `string | undefined`: the router can't promise it exists.
  const { id } = useParams<{ id: string }>();

  // skipToken = "don't fetch". Avoids requesting /api/products/undefined.
  const result = useGetProductQuery(id ?? skipToken);
  const state = toRequestState(result);

  let content: ReactNode;
  switch (state.status) {
    case "idle":
    case "loading":
      content = <p role="status">Loading product…</p>;
      break;

    case "error":
      // A missing product isn't fixed by retrying, so 404 gets its own screen.
      if (state.error.status === 404) {
        return (
          <NotFound
            title="Product not found"
            message="This product doesn't exist or is no longer available."
          />
        );
      }
      content = (
        <div role="alert">
          <p>We couldn&apos;t load this product.</p>
          <button type="button" className="button" onClick={() => void result.refetch()}>
            Try again
          </button>
        </div>
      );
      break;

    case "success": {
      const product = state.data;
      content = (
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
            <p aria-label={`Rated ${product.rating} out of 5`}>★ {product.rating.toFixed(1)} / 5</p>
            <StockBadge stock={product.stock} />
          </div>
        </article>
      );
      break;
    }
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← Back to products
      </Link>
      {content}
    </div>
  );
}
