import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { config } from "./config";
import { store } from "./store/store";
import "./main.css";

/**
 * Starts the mock API before the app renders, so the very first request is already intercepted.
 * The dynamic import() means the mock code (and 5,000 products) is only downloaded when mocks are on.
 */
async function enableMocking(): Promise<void> {
  if (!config.enableMocks) return;
  const { worker } = await import("./mocks/browser");
  // "bypass": requests we don't mock (images, fonts...) go to the network as normal.
  await worker.start({ onUnhandledRequest: "bypass" });
}

// getElementById returns `HTMLElement | null`. Strict mode forces us to handle null
// instead of crashing later with a confusing error.
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Missing <div id="root"> in index.html');
}

void enableMocking().then(() => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* Provider makes the Redux store available to every component */}
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </React.StrictMode>,
  );
});
