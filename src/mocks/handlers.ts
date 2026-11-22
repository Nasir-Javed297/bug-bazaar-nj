// MSW request handlers: the 6 endpoints of the shared API contract (docs/api-contract.md).
// Each handler: simulate network -> check switches -> auth (401) -> validate (400)
// -> business rules (404/409) -> success.
import { delay, http, HttpResponse } from "msw";
import { config } from "../config";
import {
  isCategory,
  isSortOption,
  type ApiError,
  type LoginResponse,
  type Order,
  type OrderItem,
  type Product,
  type ProductsQuery,
  type ProductsResponse,
  type User,
} from "../types/api";
import {
  createOrder,
  createToken,
  findUserByCredentials,
  getOrder,
  getProduct,
  getUserFromAuthHeader,
  queryProducts,
} from "./db";
import { getScenarios } from "./scenarios";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

// ---------- Helpers ----------

/** Builds an error response in the contract's ApiError shape. */
function apiError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string>,
): HttpResponse {
  const body: ApiError = { error: { code, message, ...(details ? { details } : {}) } };
  return HttpResponse.json(body, { status });
}

/**
 * Runs before every handler. Adds realistic latency and applies the outage switch.
 * Returns an error response to send, or undefined to continue.
 */
async function simulateServer(): Promise<HttpResponse | undefined> {
  const scenarios = getScenarios();
  // delay() with no argument = realistic random latency (100-400 ms in the browser).
  await (scenarios.slowNetwork ? delay(2000 + Math.random() * 2000) : delay());
  if (scenarios.serverOutage) {
    return apiError(500, "INTERNAL_ERROR", "The server is temporarily unavailable.");
  }
  return undefined;
}

/** Returns the logged-in user, or undefined for a missing/invalid/expired token. */
function authenticate(request: Request): User | undefined {
  if (getScenarios().expireSession) return undefined;
  return getUserFromAuthHeader(request.headers.get("Authorization"));
}

const unauthorized = () => apiError(401, "UNAUTHORIZED", "Please log in to continue.");

/** Request bodies come from outside, so they start as `unknown` and must be checked. */
async function readJson(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null; // empty or invalid JSON
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------- Handlers ----------

export const handlers = [
  // GET /api/products?search=&category=&sort=&page=&inStock=&pageSize=
  http.get(url("/products"), async ({ request }) => {
    const failure = await simulateServer();
    if (failure) return failure;
    if (getScenarios().failProductList) {
      return apiError(500, "INTERNAL_ERROR", "Could not load products.");
    }

    const params = new URL(request.url).searchParams;

    // Task D2-6: reverse the order of search replies. "d" waits 2.0 s, "du" 1.4 s,
    // "duc" 0.8 s, "duck" 0.2 s, so each longer query overtakes the shorter ones.
    const searchText = params.get("search") ?? "";
    if (getScenarios().outOfOrderSearch && searchText) {
      await delay(Math.max(200, 2600 - searchText.length * 600));
    }
    const category = params.get("category") ?? "";
    const sort = params.get("sort") ?? "";
    const query: ProductsQuery = {
      search: params.get("search") ?? undefined,
      category: isCategory(category) ? category : undefined,
      sort: isSortOption(sort) ? sort : undefined,
      page: Number(params.get("page")) || 1,
      pageSize: Number(params.get("pageSize")) || undefined,
      inStock: params.get("inStock") === "true",
    };

    return HttpResponse.json<ProductsResponse>(queryProducts(query));
  }),

  // GET /api/products/:id
  http.get<{ id: string }>(url("/products/:id"), async ({ params }) => {
    const failure = await simulateServer();
    if (failure) return failure;

    const product = getProduct(params.id);
    if (!product) {
      return apiError(404, "NOT_FOUND", "We couldn't find that product.");
    }
    return HttpResponse.json<Product>(product);
  }),

  // POST /api/login  body: { email, password }
  http.post(url("/login"), async ({ request }) => {
    const failure = await simulateServer();
    if (failure) return failure;

    const body = await readJson(request);
    const email = isRecord(body) && typeof body.email === "string" ? body.email.trim() : "";
    const password = isRecord(body) && typeof body.password === "string" ? body.password : "";

    const fieldErrors: Record<string, string> = {};
    if (!email) fieldErrors.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
    if (!password) fieldErrors.password = "Password is required.";
    if (Object.keys(fieldErrors).length > 0) {
      return apiError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrors);
    }

    const user = findUserByCredentials(email, password);
    if (!user) {
      return apiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }
    return HttpResponse.json<LoginResponse>({ token: createToken(user.id), user });
  }),

  // GET /api/me  header: Authorization: Bearer <token>
  http.get(url("/me"), async ({ request }) => {
    const failure = await simulateServer();
    if (failure) return failure;

    const user = authenticate(request);
    if (!user) return unauthorized();
    return HttpResponse.json<User>(user);
  }),

  // POST /api/orders  body: { items: [{ productId, quantity }] }  header: Idempotency-Key
  http.post(url("/orders"), async ({ request }) => {
    const failure = await simulateServer();
    if (failure) return failure;

    const user = authenticate(request);
    if (!user) return unauthorized();

    // 400: validate the body shape and every item.
    const body = await readJson(request);
    const rawItems = isRecord(body) ? body.items : undefined;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return apiError(400, "VALIDATION_ERROR", "Your cart is empty.", {
        items: "Add at least one item.",
      });
    }

    // Merge duplicate lines, e.g. two lines of the same duck become one line of 2.
    const quantities = new Map<string, number>();
    for (const [index, item] of rawItems.entries()) {
      const productId = isRecord(item) ? item.productId : undefined;
      const quantity = isRecord(item) ? item.quantity : undefined;
      if (typeof productId !== "string" || !getProduct(productId)) {
        return apiError(400, "VALIDATION_ERROR", "One of the items doesn't exist.", {
          [`items.${index}.productId`]: "Unknown product.",
        });
      }
      if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
        return apiError(400, "VALIDATION_ERROR", "Quantities must be whole numbers above 0.", {
          [`items.${index}.quantity`]: "Must be a whole number of at least 1.",
        });
      }
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
    const items: OrderItem[] = [...quantities].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    // 409 on purpose (Dev panel): pretend the first item just sold out.
    const firstProduct = items[0] ? getProduct(items[0].productId) : undefined;
    if (getScenarios().forceOutOfStock && firstProduct) {
      return apiError(409, "OUT_OF_STOCK", `${firstProduct.name} just sold out.`, {
        productId: firstProduct.id,
        productName: firstProduct.name,
        available: "0",
      });
    }

    const result = createOrder(user.id, items, request.headers.get("Idempotency-Key"));
    if (!result.ok) {
      const { product } = result;
      return apiError(409, "OUT_OF_STOCK", `Only ${product.stock} of ${product.name} left.`, {
        productId: product.id,
        productName: product.name,
        available: String(product.stock),
      });
    }
    // Dev panel switch: the order IS saved, but the client never hears back (task D3-2).
    if (getScenarios().loseOrderResponse) {
      return apiError(500, "INTERNAL_ERROR", "The connection was interrupted.");
    }
    return HttpResponse.json<Order>(result.order, { status: 201 });
  }),

  // GET /api/orders/:id
  http.get<{ id: string }>(url("/orders/:id"), async ({ request, params }) => {
    const failure = await simulateServer();
    if (failure) return failure;

    const user = authenticate(request);
    if (!user) return unauthorized();

    const order = getOrder(params.id, user.id);
    if (!order) return apiError(404, "NOT_FOUND", "We couldn't find that order.");
    return HttpResponse.json<Order>(order);
  }),
];
