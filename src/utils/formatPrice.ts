// Prices are stored as integer cents (1999 = $19.99) to avoid floating-point errors.
// This is the ONLY place that turns cents into text, so every price looks the same.

// Created once and reused: building an Intl formatter is slow compared to calling it.
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** formatPrice(1999) -> "$19.99", formatPrice(500) -> "$5.00", formatPrice(124900) -> "$1,249.00" */
export function formatPrice(cents: number): string {
  return usd.format(cents / 100);
}
