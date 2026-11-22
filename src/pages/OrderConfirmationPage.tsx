// Route "/orders/:id": confirmation after checkout, with the order's live status.
// The order moves queued -> processing -> completed, so we poll until it's completed.
// Protected by RequireAuth (App.tsx): an order belongs to a user.
import { skipToken } from "@reduxjs/toolkit/query";
import { Link, useParams } from "react-router-dom";
import { api, useGetOrderQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import { QueryStateView } from "../components/QueryStateView";
import { useAppSelector } from "../store/hooks";
import type { OrderStatus } from "../types/api";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "queued", label: "Order received" },
  { status: "processing", label: "Processing payment and stock" },
  { status: "completed", label: "Confirmed" },
];

/** Re-check the status this often while the order isn't completed. */
const POLL_EVERY_MS = 2000;

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();

  // What the cache already knows (from the previous poll), read BEFORE the hook below,
  // so we can tell the hook whether to keep polling.
  const cachedStatus = useAppSelector((state) =>
    id ? api.endpoints.getOrder.select(id)(state).data?.status : undefined,
  );
  const lastPollFailed = useAppSelector((state) =>
    id ? api.endpoints.getOrder.select(id)(state).isError : false,
  );

  const result = useGetOrderQuery(id ?? skipToken, {
    // Poll until completed, then stop. Also stop after an error: a 404 never fixes itself
    // (polling it made the page flicker every 2 s), and "Try again" restarts a 500.
    // RTK Query also clears the timer when the page closes.
    pollingInterval: cachedStatus === "completed" || lastPollFailed ? 0 : POLL_EVERY_MS,
  });
  const state = toRequestState(result);

  return (
    <div className="page">
      <QueryStateView
        state={state}
        loadingLabel="Loading your order…"
        errorTitle="We couldn't load your order"
        notFound={{ title: "Order not found", message: "We couldn't find that order." }}
        onRetry={() => void result.refetch()}
      >
        {(order) => {
          const currentStep = STEPS.findIndex((step) => step.status === order.status);
          return (
            <section className="order-confirmation">
              <h1>Thank you for your order!</h1>
              <p>
                Order number: <strong>{order.id}</strong>
              </p>
              {/* aria-live: screen readers announce status changes as polling updates them. */}
              <ol className="order-steps" aria-live="polite">
                {STEPS.map((step, index) => (
                  <li
                    key={step.status}
                    className={index <= currentStep ? "order-steps__done" : undefined}
                    aria-current={index === currentStep ? "step" : undefined}
                  >
                    {step.label}
                  </li>
                ))}
              </ol>
              <Link to="/" className="button">
                Continue shopping
              </Link>
            </section>
          );
        }}
      </QueryStateView>
    </div>
  );
}
