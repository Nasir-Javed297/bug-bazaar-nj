// The mock "database" and business rules. It knows nothing about HTTP:
// the handlers in handlers.ts translate these results into status codes.
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Product,
  type ProductsQuery,
  type ProductsResponse,
  type User,
} from "../types/api";
import { isRecord, readStorage, writeStorage } from "../utils/storage";
import { MOCK_DB_STORAGE_KEY } from "./scenarios";
import { seedProducts } from "./seed";

// ---------- Products ----------

const products: Product[] = seedProducts();
const productsById = new Map(products.map((product) => [product.id, product]));

export function getProduct(id: string): Product | undefined {
  return productsById.get(id);
}

/**
 * Changes a product's stock by `delta` (never below 0) and returns the new stock.
 * Used by the live stock feed (task D4-4) to simulate other shoppers and restocks.
 */
export function changeStock(id: string, delta: number): number | undefined {
  const product = productsById.get(id);
  if (!product) return undefined;
  product.stock = Math.max(0, product.stock + delta);
  return product.stock;
}

/** Search, filter, sort and paginate. Mirrors what a real server would do in SQL. */
export function queryProducts(query: ProductsQuery): ProductsResponse {
  const search = query.search?.trim().toLowerCase() ?? "";

  let result = products.filter(
    (product) =>
      (search === "" || product.name.toLowerCase().includes(search)) &&
      (query.category === undefined || product.category === query.category) &&
      (!query.inStock || product.stock > 0),
  );

  // Copy before sorting: Array.prototype.sort mutates the array it is called on.
  switch (query.sort) {
    case "price-asc":
      result = [...result].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result = [...result].sort((a, b) => b.price - a.price);
      break;
    case "rating":
      result = [...result].sort((a, b) => b.rating - a.rating);
      break;
    case "name":
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      // "relevance" or no sort: keep catalogue order.
      break;
  }

  const pageSize = Math.min(Math.max(query.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(query.page ?? 1, 1);
  const start = (page - 1) * pageSize;

  return { items: result.slice(start, start + pageSize), total: result.length };
}

// ---------- Users and tokens ----------

type UserRecord = User & { password: string };

/** Demo accounts. Documented in README.md and docs/api-contract.md. */
const USERS: UserRecord[] = [
  { id: "u-1", name: "Demo Developer", email: "demo@bugbazaar.dev", password: "password123" },
];

/** Tokens expire after 2 hours, so the "expired session -> 401" path is realistic. */
const TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000;

function toPublicUser({ id, name, email }: UserRecord): User {
  return { id, name, email }; // never send the password back
}

export function findUserByCredentials(email: string, password: string): User | undefined {
  const record = USERS.find(
    (user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password,
  );
  return record ? toPublicUser(record) : undefined;
}

/**
 * A simplified JWT: the user id and expiry time, base64-encoded.
 * The server doesn't need to remember tokens, so they survive a page reload.
 * (A real JWT is also signed, so it can't be forged. This mock skips that.)
 */
export function createToken(userId: string): string {
  return `mock.${btoa(JSON.stringify({ sub: userId, exp: Date.now() + TOKEN_LIFETIME_MS }))}`;
}

/** Reads `Authorization: Bearer <token>` and returns the user, or undefined if invalid/expired. */
export function getUserFromAuthHeader(header: string | null): User | undefined {
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (!token?.startsWith("mock.")) return undefined;

  try {
    const payload: unknown = JSON.parse(atob(token.slice("mock.".length)));
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("sub" in payload) ||
      !("exp" in payload) ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return undefined;
    }
    const record = USERS.find((user) => user.id === payload.sub);
    return record ? toPublicUser(record) : undefined;
  } catch {
    return undefined; // not valid base64 / JSON
  }
}

// ---------- Orders (persisted in localStorage) ----------

type StoredOrder = Order & { userId: string; createdAt: number; items: OrderItem[] };

type PersistedState = {
  /** productId -> current stock, only for products whose stock changed. */
  stock: Record<string, number>;
  orders: StoredOrder[];
  /** Idempotency-Key header -> order id. */
  idempotency: Record<string, string>;
};

const STORAGE_KEY = MOCK_DB_STORAGE_KEY;
const orders = new Map<string, StoredOrder>();
const idempotency = new Map<string, string>();

function save(): void {
  const stock: Record<string, number> = {};
  for (const order of orders.values()) {
    for (const item of order.items) {
      const product = productsById.get(item.productId);
      if (product) stock[product.id] = product.stock;
    }
  }
  const state: PersistedState = {
    stock,
    orders: [...orders.values()],
    idempotency: Object.fromEntries(idempotency),
  };
  // Shared helper (src/utils/storage.ts): never throws; the mock still works in memory if it fails.
  writeStorage(STORAGE_KEY, state);
}

function isPersistedState(value: unknown): value is PersistedState {
  return (
    isRecord(value) &&
    isRecord(value.stock) &&
    Array.isArray(value.orders) &&
    isRecord(value.idempotency)
  );
}

function load(): void {
  const state = readStorage(STORAGE_KEY, isPersistedState);
  if (!state) return; // nothing saved yet, or corrupt: start fresh
  for (const [id, stock] of Object.entries(state.stock)) {
    const product = productsById.get(id);
    if (product) product.stock = stock;
  }
  for (const order of state.orders) orders.set(order.id, order);
  for (const [key, orderId] of Object.entries(state.idempotency)) idempotency.set(key, orderId);
}

load();

/** Orders move through statuses over time, like a real queue would process them. */
function statusFor(order: StoredOrder): OrderStatus {
  const age = Date.now() - order.createdAt;
  if (age < 5_000) return "queued";
  if (age < 15_000) return "processing";
  return "completed";
}

function toPublicOrder(order: StoredOrder): Order {
  return { id: order.id, status: statusFor(order) };
}

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; reason: "out-of-stock"; product: Product; requested: number };

/**
 * Places an order. All-or-nothing: stock is checked for EVERY item before any stock changes.
 * If the same idempotency key was used before, the original order is returned instead of a new one.
 */
export function createOrder(
  userId: string,
  items: OrderItem[],
  idempotencyKey: string | null,
): CreateOrderResult {
  if (idempotencyKey) {
    const existingId = idempotency.get(idempotencyKey);
    const existing = existingId ? orders.get(existingId) : undefined;
    if (existing) return { ok: true, order: toPublicOrder(existing) };
  }

  for (const item of items) {
    const product = productsById.get(item.productId);
    if (product && item.quantity > product.stock) {
      return { ok: false, reason: "out-of-stock", product, requested: item.quantity };
    }
  }

  for (const item of items) {
    const product = productsById.get(item.productId);
    if (product) product.stock -= item.quantity;
  }

  const order: StoredOrder = {
    id: `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    status: "queued",
    userId,
    createdAt: Date.now(),
    items,
  };
  orders.set(order.id, order);
  if (idempotencyKey) idempotency.set(idempotencyKey, order.id);
  save();

  return { ok: true, order: toPublicOrder(order) };
}

/** Returns the order only if it belongs to this user (others get "not found"). */
export function getOrder(id: string, userId: string): Order | undefined {
  const order = orders.get(id);
  return order && order.userId === userId ? toPublicOrder(order) : undefined;
}
