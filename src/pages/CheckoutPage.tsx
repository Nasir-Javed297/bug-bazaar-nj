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
import { describeError, type UserError } from "../api/errorMessages";
import { toClientError } from "../api/requestState";
import { OrderSummary } from "../components/OrderSummary";
import { EmptyState } from "../components/StatusViews";
import { cartCleared, selectCartItems, stockUpdated } from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { formatPrice } from "../utils/formatPrice";

/** A fresh, random idempotency key. */
const newIdempotencyKey = () => crypto.randomUUID();

/**
 * The checkout's wording on top of the shared mapping (describeError): every error kind is
 * decided in ONE place; checkout only adds what to do next in this flow.
 */
function checkoutMessage(userError: UserError): string {
  switch (userError.kind) {
    case "outOfStock":
      return userError.available > 0
        ? `${userError.message} We've updated your cart: please check it and place your order again.`
        : `${userError.message} We've removed it from your cart: please check it and place your order again.`;
    case "validation":
      return "Something in your cart isn't valid any more. Please review it.";
    case "retryable":
      return `${userError.message} You won't be charged twice.`;
    case "unauthorized":
    case "notFound":
      return userError.message;
  }
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
      const userError = describeError(toClientError(err));
      setErrorMessage(checkoutMessage(userError));

      if (userError.kind === "outOfStock" && userError.productId) {
        // Apply the real stock to the cart. The cart has changed, so it's a different order
        // now: give the next attempt a NEW key.
        dispatch(stockUpdated({ productId: userError.productId, stock: userError.available }));
        setIdempotencyKey(newIdempotencyKey());
      }
      // 401: the base query has already signed the user out, and RequireAuth sends them to
      // log in, then back here with the cart intact.
      // Anything else (500, network...): keep the SAME key, so retrying is safe.
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
