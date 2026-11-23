// One product in the grid: image, category, rating, name, stock, price and "Add to cart".
// Presentational component: it only receives data through props and displays it.
import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Product } from "../types/api";
import { CATEGORY_LABELS } from "../utils/categoryLabels";
import { formatPrice } from "../utils/formatPrice";
import { CardAddToCart } from "./CardAddToCart";
import { StockBadge } from "./StockBadge";

type ProductCardProps = {
  product: Product;
};

/**
 * Wrapped in React.memo (task D4-3, docs/performance.md): skip re-rendering when the props are the
 * same objects as last time. While the virtualized list scrolls, its parent re-renders every frame;
 * without memo every visible card re-rendered ~60 times per frame for nothing. `product` comes from
 * the RTK Query cache, so it's the same object until the data really changes. (A memoized component
 * still re-renders when a context it reads changes, e.g. useLocation() on navigation. That's correct.)
 */
export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  // The current list URL (with its filters), so the details page can link back to the same view.
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;

  return (
    <article className="product-card">
      <div className="product-card__media">
        {/* alt="": the image is decorative, the name below already says what it is. */}
        <img
          className="product-card__image"
          src={product.imageUrl}
          alt=""
          width={320}
          height={240}
          loading="lazy"
        />
      </div>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="product-card__category">{CATEGORY_LABELS[product.category]}</span>
          <span className="product-card__rating" aria-label={`Rated ${product.rating} out of 5`}>
            ★ {product.rating.toFixed(1)}
          </span>
        </div>
        <h2 className="product-card__name">
          {/* CSS stretches this link's click area over the whole card, so clicking anywhere
              opens the product. Tab order per card: this link, then "Add to cart". */}
          <Link to={`/products/${product.id}`} state={{ from }} className="product-card__link">
            {product.name}
          </Link>
        </h2>
        <StockBadge stock={product.stock} />
        <p className="product-card__price">{formatPrice(product.price)}</p>
        {/* Sits ABOVE the card's stretched link, so clicking it adds to the cart instead of
            opening the product. */}
        <CardAddToCart product={product} />
      </div>
    </article>
  );
});
