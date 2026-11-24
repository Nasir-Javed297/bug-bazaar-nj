// The shared API contract, written as TypeScript types.
// Every part of the app (mock server, data layer, components) imports from here,
// so there is exactly one definition of each shape. See docs/api-contract.md.

// ---------- Products ----------

// A "union of string literals": category can ONLY be one of these four strings.
// `category: "shoes"` would be a compile error.
export const CATEGORIES = ["keyboards", "ducks", "coffee", "stickers"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Type guard: turns any string (e.g. from a URL) into a `Category`, or rejects it. */
export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export type Product = {
  id: string;
  name: string;
  /** Price in cents: 1999 means $19.99. Never store money as a float. */
  price: number;
  category: Category;
  stock: number;
  rating: number;
  imageUrl: string;
};

export const SORT_OPTIONS = ["relevance", "price-asc", "price-desc", "rating", "name"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export function isSortOption(value: string): value is SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value);
}

/** Default number of products per page. */
export const DEFAULT_PAGE_SIZE = 24;
/** Largest page the API will return (enough to fetch every product at once). */
export const MAX_PAGE_SIZE = 5000;

/** Query parameters for GET /api/products. All are optional. */
export type ProductsQuery = {
  search?: string;
  category?: Category;
  sort?: SortOption;
  /** 1-based page number. */
  page?: number;
  /** Extension to the shared contract: only return products with stock > 0. */
  inStock?: boolean;
  /** Extension to the shared contract: items per page (default 24, max 5000). */
  pageSize?: number;
};

/** 200 response of GET /api/products. */
export type ProductsResponse = {
  items: Product[];
  /** Total number of matching products across all pages. */
  total: number;
};

// ---------- Auth ----------

export type User = {
  id: string;
  name: string;
  email: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

/** 200 response of POST /api/login. */
export type LoginResponse = {
  token: string;
  user: User;
};

// ---------- Orders ----------

export type OrderItem = {
  productId: string;
  quantity: number;
};

export type CreateOrderRequest = {
  items: OrderItem[];
};

export type OrderStatus = "queued" | "processing" | "completed";

/** 201 response of POST /api/orders and 200 response of GET /api/orders/:id. */
export type Order = {
  id: string;
  status: OrderStatus;
};

// ---------- Errors ----------

/** Every non-2xx response body has this shape. */
export type ApiError = {
  error: {
    code: string;
    message: string;
    /** For 400: field name -> message. For 409: which product ran out. */
    details?: Record<string, string>;
  };
};

// ---------- Live stock feed (WebSocket, task D4-4) ----------

/** Browser -> server: "send me stock changes for these products". */
export type StockSubscribeMessage = {
  type: "subscribe";
  productIds: string[];
};

/** Server -> browser: one product's new stock level. */
export type StockUpdateMessage = {
  type: "stock";
  productId: string;
  stock: number;
};

/** WebSocket messages come from outside the app, so they're checked before use. */
export function isStockUpdateMessage(value: unknown): value is StockUpdateMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "stock" &&
    "productId" in value &&
    typeof value.productId === "string" &&
    "stock" in value &&
    typeof value.stock === "number" &&
    Number.isInteger(value.stock) &&
    value.stock >= 0
  );
}
