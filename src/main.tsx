import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./main.css";

// getElementById returns `HTMLElement | null`. Strict mode forces us to handle null
// instead of crashing later with a confusing error.
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Missing <div id="root"> in index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
