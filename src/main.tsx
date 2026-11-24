import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { config } from "./config";
import { installGlobalErrorHandlers } from "./monitoring/logger";
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
  await worker.start({
    onUnhandledRequest: "bypass",
    // The worker file lives next to index.html, which is under the sub-path on GitHub Pages
    // (import.meta.env.BASE_URL is "/" locally, "/bug-bazaar-nj/" there).
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}

// getElementById returns `HTMLElement | null`. Strict mode forces us to handle null
// instead of crashing later with a confusing error.
// Log errors that error boundaries can't catch (event handlers, timers, promises). Task D4-7.
installGlobalErrorHandlers();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Missing <div id="root"> in index.html');
}

void enableMocking().then(() => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* Last-resort boundary: if even the header or the providers crash, show a fallback. */}
      <ErrorBoundary>
        {/* Provider makes the Redux store available to every component */}
        <Provider store={store}>
          {/* basename: every route is relative to the site's base (/bug-bazaar-nj/ on Pages).
              BASE_URL ends with "/"; the router wants it without. */}
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <App />
          </BrowserRouter>
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
});
