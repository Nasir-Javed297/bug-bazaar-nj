// Route "/orders/:id": confirmation after checkout, with the order's live status.
// The order moves queued -> processing -> completed, so we poll until it's completed.
import { skipToken } from "@reduxjs/toolkit/query";
import { Link, useParams } from "react-router-dom";
import { api, useGetOrderQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import { QueryStateView } from "../components/QueryStateView";
import { useAppSelector } from "../store/hooks";
import type { OrderStatus } from "../types/api";
import { NotFound } from "./NotFound";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "queued", label: "Order received" },
  { status: "processing", label: "Processing payment and stock" },
  { status: "completed", label: "Confirmed" },
];

/** Re-check the status this often while the order isn't completed. */
const POLL_EVERY_MS = 2000;

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();

  // The status already in the cache (from the previous poll), read BEFORE the hook below,
  // so we can tell the hook whether to keep polling.
  const cachedStatus = useAppSelector((state) =>
    id ? api.endpoints.getOrder.select(id)(state).data?.status : undefined,
  );

  const result = useGetOrderQuery(id ?? skipToken, {
    // Poll until completed, then stop. RTK Query also clears the timer when the page closes.
    pollingInterval: cachedStatus === "completed" ? 0 : POLL_EVERY_MS,
  });
  const state = toRequestState(result);

  if (state.status === "error" && state.error.status === 404) {
    return <NotFound title="Order not found" message="We couldn't find that order." />;
  }

  return (
    <div className="page">
      <QueryStateView
        state={state}
        loadingLabel="Loading your order…"
        errorTitle="We couldn't load your order"
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
