// Starts MSW in the browser: registers public/mockServiceWorker.js, which intercepts fetch
// calls and answers them with our handlers. Tests (D4-5) use the same handlers via msw/node.
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
