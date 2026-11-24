// Helpers for tests that render the whole app and use it like a shopper would.
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../App";
import { createToken, getProduct } from "../mocks/db";
import { DEFAULT_SCENARIOS, SCENARIOS_STORAGE_KEY, type MockScenarios } from "../mocks/scenarios";
import type { Session } from "../store/authSlice";
import type { CartItem } from "../store/cartSlice";
import { makeStore } from "../store/store";

/** Shows the current URL, so tests can check what a shared link would contain. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

type RenderAppOptions = {
  cart?: CartItem[];
  session?: Session | null;
};

/**
 * Renders the whole app at `route`, with a FRESH store (nothing leaks between tests).
 * Returns `user` (types and clicks like a person) and the `store` (to check state).
 */
export function renderApp(route = "/", { cart = [], session = null }: RenderAppOptions = {}) {
  const store = makeStore({
    cart: { items: cart },
    auth: { session, logoutReason: null },
  });
  const user = userEvent.setup();
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </Provider>,
  );
  return { store, user, ...view };
}

/** A valid session for the demo user, as if they had logged in. */
export function demoSession(): Session {
  return {
    token: createToken("u-1"),
    user: { id: "u-1", name: "Demo Developer", email: "demo@bugbazaar.dev" },
  };
}

/** A cart line for a real seeded product. `stock` can be overridden to simulate a stale copy. */
export function cartItem(productId: string, quantity: number, stock?: number): CartItem {
  const product = getProduct(productId);
  if (!product) throw new Error(`No seeded product ${productId}`);
  return {
    productId,
    name: product.name,
    price: product.price,
    imageUrl: product.imageUrl,
    stock: stock ?? product.stock,
    quantity,
  };
}

/** Turns on mock API switches (the same ones as the Dev panel). */
export function setScenarios(on: Partial<MockScenarios>): void {
  window.localStorage.setItem(
    SCENARIOS_STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_SCENARIOS, ...on }),
  );
}
