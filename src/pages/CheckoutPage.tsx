// Route "/checkout": review the order and place it. Protected by RequireAuth (App.tsx),
// so there is always a session here.
//
// Duplicate orders are prevented in two layers:
// 1. The button is disabled while the order is being sent (no double-click double-submit).
// 2. Every attempt of the SAME order sends the SAME Idempotency-Key. If the server saved the
//    order but the reply was lost, retrying returns that order instead of creating a second one.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCreateOrderMutation } from "../api/apiSlice";
import type { ClientError } from "../api/client";
import { toClientError } from "../api/requestState";
import { OrderSummary } from "../components/OrderSummary";
import { EmptyState } from "../components/StatusViews";
import { cartCleared, selectCartItems, stockUpdated, type CartItem } from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { formatPrice } from "../utils/formatPrice";

/** A fresh, random idempotency key. */
const newIdempotencyKey = () => crypto.randomUUID();

/** Turns a checkout error into a message for the shopper. Raw server messages are never shown. */
function describeCheckoutError(error: ClientError, items: CartItem[]): string {
  if (error.status === 409) {
    const productId = error.details?.productId;
    const name =
      error.details?.productName ??
      items.find((item) => item.productId === productId)?.name ??
      "One of the items";
    const available = Number(error.details?.available ?? 0);
    return available > 0
      ? `Sorry, only ${available} of "${name}" ${available === 1 ? "is" : "are"} left. We've updated your cart: please check it and place your order again.`
      : `Sorry, "${name}" just sold out. We've removed it from your cart: please check it and place your order again.`;
  }
  if (error.status === 401) return "Your session has expired. Please log in again to check out.";
  if (error.status === 400) return "Something in your cart isn't valid any more. Please review it.";
  return "We couldn't place your order. Please try again: you won't be charged twice.";
}

export function CheckoutPage() {
  const items = useAppSelector(selectCartItems);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [createOrder, { isLoading }] = useCreateOrderMutation();

  // One key per order attempt, kept across retries (lazy initial state: generated once).
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const placeOrder = async () => {
    setErrorMessage(null);
    try {
      // .unwrap() returns the data on success and THROWS the error on failure.
      const order = await createOrder({
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
        idempotencyKey,
      }).unwrap();
      navigate(`/orders/${order.id}`, { replace: true });
      dispatch(cartCleared());
    } catch (err: unknown) {
      const error = toClientError(err);
      setErrorMessage(describeCheckoutError(error, items));

      if (error.status === 409 && error.details?.productId) {
        // Apply the real stock to the cart. The cart has changed, so it's a different order
        // now: give the next attempt a NEW key.
        dispatch(
          stockUpdated({
            productId: error.details.productId,
            stock: Number(error.details.available ?? 0),
          }),
        );
        setIdempotencyKey(newIdempotencyKey());
      }
      // Any other error (500, network...): keep the SAME key, so retrying is safe.
    }
  };

  if (items.length === 0 && !errorMessage) {
    return (
      <div className="page">
        <EmptyState
          title="Your cart is empty"
          action={
            <Link to="/" className="button">
              Browse products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Checkout</h1>

      {errorMessage && (
        // role="alert": the error is announced immediately by screen readers.
        <div className="alert alert--error" role="alert">
          <p>{errorMessage}</p>
          {items.length > 0 && <Link to="/cart">Review your cart</Link>}
        </div>
      )}

      <div className="cart-layout">
        <ul className="checkout-lines">
          {items.map((item) => (
            <li key={item.productId}>
              <span>
                {item.quantity} × {item.name}
              </span>
              <strong>{formatPrice(item.price * item.quantity)}</strong>
            </li>
          ))}
        </ul>

        <OrderSummary>
          <button
            type="button"
            className="button"
            onClick={() => void placeOrder()}
            // Layer 1 against duplicates: no second click while the first is in flight.
            disabled={isLoading || items.length === 0}
            aria-busy={isLoading}
          >
            {isLoading ? "Placing order…" : "Place order"}
          </button>
        </OrderSummary>
      </div>
    </div>
  );
}
