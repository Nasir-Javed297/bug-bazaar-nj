// The shared API contract, written as TypeScript types.
// Every part of the app (mock server, data layer, components) imports from here,
// so there is exactly one definition of each shape. See docs/api-contract.md.

// ---------- Products ----------

// A "union of string literals": category can ONLY be one of these four strings.
// `category: "shoes"` would be a compile error.
export const CATEGORIES = ["keyboards", "ducks", "coffee", "stickers"] as const;
export type Category = (typeof CATEGORIES)[number];

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

/** Query parameters for GET /api/products. All are optional. */
export type ProductsQuery = {
  search?: string;
  category?: Category;
  sort?: SortOption;
  /** 1-based page number. */
  page?: number;
  /** Extension to the shared contract: only return products with stock > 0. */
  inStock?: boolean;
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
