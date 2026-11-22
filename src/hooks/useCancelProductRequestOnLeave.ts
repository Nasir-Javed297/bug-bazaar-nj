// Cancels a product's in-flight request when the user leaves that product
// (switches to another product, or leaves the details page).
//
// RTK Query already guarantees the page never SHOWS an old product (we read `currentData`),
// but on its own it lets the old request finish in the background. This hook cancels it:
// RTK Query aborts its AbortSignal, which client.ts passed to fetch(), so the browser
// stops the request ("(canceled)" in DevTools > Network).
import { useEffect, useRef } from "react";
import { api } from "../api/apiSlice";
import { useAppDispatch } from "../store/hooks";

export function useCancelProductRequestOnLeave(productId: string | undefined) {
  const dispatch = useAppDispatch();
  // A cancel that has been scheduled but hasn't happened yet.
  const scheduledCancel = useRef<{ productId: string; timer: number } | null>(null);

  useEffect(() => {
    if (!productId) return;

    // In development, React's StrictMode runs effects as "set up, clean up, set up again" to
    // catch missing cleanups. If we're being set up again for the SAME product, the user never
    // left: keep the request by un-scheduling the cancel.
    if (scheduledCancel.current?.productId === productId) {
      window.clearTimeout(scheduledCancel.current.timer);
      scheduledCancel.current = null;
    }

    return () => {
      // Cleanup: runs when the product changes or the page closes.
      // Wait one tick, so the StrictMode re-run above can still cancel the cancel.
      const timer = window.setTimeout(() => {
        // The still-running request for this product, if there is one (undefined if finished).
        const running = dispatch(api.util.getRunningQueryThunk("getProduct", productId));
        running?.abort();
        scheduledCancel.current = null;
      }, 0);
      scheduledCancel.current = { productId, timer };
    };
  }, [productId, dispatch]);
}
