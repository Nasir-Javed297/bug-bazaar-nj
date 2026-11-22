// One product in the grid: image, name, price, rating and stock.
// Presentational component: it only receives data through props and displays it.
import { Link } from "react-router-dom";
import type { Product } from "../types/api";
import { formatPrice } from "../utils/formatPrice";
import { StockBadge } from "./StockBadge";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-card">
      {/* alt="": the image is decorative, the name below already says what it is. */}
      <img
        className="product-card__image"
        src={product.imageUrl}
        alt=""
        width={320}
        height={240}
        loading="lazy"
      />
      <div className="product-card__body">
        <h2 className="product-card__name">
          {/* The ONLY focusable element in the card. CSS stretches its click area over
              the whole card, so Tab moves product -> product and Enter opens it. */}
          <Link to={`/products/${product.id}`} className="product-card__link">
            {product.name}
          </Link>
        </h2>
        <p className="product-card__price">{formatPrice(product.price)}</p>
        <div className="product-card__meta">
          <span aria-label={`Rated ${product.rating} out of 5`}>★ {product.rating.toFixed(1)}</span>
          <StockBadge stock={product.stock} />
        </div>
      </div>
    </article>
  );
}
