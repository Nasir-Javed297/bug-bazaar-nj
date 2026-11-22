// The only file that reads environment variables. Everything else imports `config`.
// Each value has a default, so the app runs even without a .env file.

export const config = {
  /** Every API request is sent relative to this URL. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
  /** Start the in-browser mock API (MSW). Defaults to on. */
  enableMocks: (import.meta.env.VITE_ENABLE_MOCKS ?? "true") === "true",
  /** WebSocket for live stock (task D4-4). Defaults to /ws/stock on the current host. */
  stockFeedUrl:
    import.meta.env.VITE_STOCK_FEED_URL ??
    `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/stock`,
} as const;
