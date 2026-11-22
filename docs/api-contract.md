# API contract

The shared contract that every part of The Bug Bazaar builds against. TypeScript versions of every type are in [`src/types/api.ts`](../src/types/api.ts). The mock implementation is in [`src/mocks/`](../src/mocks).

- **Base URL:** `/api` (configurable with `VITE_API_BASE_URL`)
- **Format:** JSON request and response bodies (`Content-Type: application/json`)
- **Money:** every price is an **integer number of cents**. `1999` means $19.99. Integers avoid floating-point rounding errors (`0.1 + 0.2 !== 0.3`).
- **Auth:** endpoints marked 🔒 need the header `Authorization: Bearer <token>`, using the token from `POST /api/login`.

## Types

```ts
type Product = {
  id: string; // "p-0001" ... "p-5000"
  name: string;
  price: number; // cents
  category: "keyboards" | "ducks" | "coffee" | "stickers";
  stock: number;
  rating: number; // 1.0 - 5.0
  imageUrl: string;
};

type User = { id: string; name: string; email: string };

type Order = { id: string; status: "queued" | "processing" | "completed" };

type ApiError = {
  error: {
    code: string; // machine-readable, e.g. "OUT_OF_STOCK"
    message: string; // safe to log; the UI shows its own friendly text
    details?: Record<string, string>; // 400: field -> message. 409: which product.
  };
};
```

## Endpoints

| Method | Endpoint                                      | Success                                   | Errors                          |
| ------ | --------------------------------------------- | ----------------------------------------- | ------------------------------- |
| GET    | `/api/products?search=&category=&sort=&page=` | 200 `{ items: Product[], total: number }` | 500                             |
| GET    | `/api/products/:id`                           | 200 `Product`                             | 404                             |
| POST   | `/api/login`                                  | 200 `{ token, user }`                     | 400, 401                        |
| GET    | `/api/me` 🔒                                  | 200 `User`                                | 401                             |
| POST   | `/api/orders` 🔒                              | 201 `{ id, status: "queued" }`            | 400, 401, 409 when out of stock |
| GET    | `/api/orders/:id` 🔒                          | 200 `{ id, status }`                      | 401, 404                        |

### `GET /api/products`

| Query param | Values                                                                        | Default     |
| ----------- | ----------------------------------------------------------------------------- | ----------- |
| `search`    | Case-insensitive match on the product name                                    | (none)      |
| `category`  | `keyboards` \| `ducks` \| `coffee` \| `stickers` (unknown values are ignored) | all         |
| `sort`      | `relevance` \| `price-asc` \| `price-desc` \| `rating` \| `name`              | `relevance` |
| `page`      | 1-based page number                                                           | `1`         |
| `inStock`   | `true` = only products with `stock > 0` _(extension)_                         | `false`     |
| `pageSize`  | Items per page, 1-5000 _(extension)_                                          | `24`        |

`total` is the number of matching products across **all** pages, so the UI can show "312 results" and work out the page count.

### `POST /api/login`

```json
// request
{ "email": "demo@bugbazaar.dev", "password": "password123" }
// 200
{ "token": "mock.eyJzdWIiOiJ1LTEi...", "user": { "id": "u-1", "name": "Demo Developer", "email": "demo@bugbazaar.dev" } }
```

- **400** `VALIDATION_ERROR`: missing or invalid fields. `details` maps each field to a message: `{ "email": "Enter a valid email address." }`.
- **401** `INVALID_CREDENTIALS`: wrong email or password.

Tokens expire after 2 hours. After that, 🔒 endpoints return 401.

### `POST /api/orders` 🔒

```json
// request (header: Idempotency-Key: <unique id per checkout attempt>)
{ "items": [{ "productId": "p-0042", "quantity": 2 }] }
// 201
{ "id": "o-mwrwlrn3-c04yg", "status": "queued" }
```

- **400** `VALIDATION_ERROR`: empty cart, unknown product, or a quantity that isn't a whole number ≥ 1. `details` names the item, e.g. `{ "items.0.quantity": "..." }`.
- **401** `UNAUTHORIZED`: missing, invalid or expired token.
- **409** `OUT_OF_STOCK`: an item has fewer in stock than requested. `details` names it: `{ "productId": "p-0042", "productName": "Glow Debug Duck #42", "available": "1" }`. Nothing is ordered (all-or-nothing).
- **`Idempotency-Key` header** _(extension)_: if a request repeats a key that already created an order, the server returns **the same order** instead of creating a second one. That makes a retried checkout safe.

An order's `status` moves `queued` → `processing` (after ~5 s) → `completed` (after ~15 s).

### `GET /api/orders/:id` 🔒

Returns 404 if the order doesn't exist **or belongs to another user**. We don't reveal that someone else's order exists.

## Extensions to the shared contract

Everything above matches the shared contract. These additions don't break it:

1. `inStock` and `pageSize` query params on `GET /api/products`.
2. The `Idempotency-Key` request header on `POST /api/orders`.
3. Defined request bodies for login and orders, the `User` shape, and the order status values (the shared contract left these open).

## Mock implementation

- **MSW (Mock Service Worker)** intercepts `fetch` calls in the browser and answers from `src/mocks/handlers.ts`. Requests appear in DevTools → Network like real ones.
- **5,000 products** are generated in `src/mocks/seed.ts` from a fixed random seed, so they're identical on every load (`p-0042` is always the same product).
- **Orders and stock changes** are saved in `localStorage` (`bug-bazaar:mock-db`), so they survive a page refresh. The Dev panel's **Reset orders and stock** button clears them.
- **Latency:** every response takes 100-400 ms, like a real network.

**Demo account:** `demo@bugbazaar.dev` / `password123`

## How to trigger each error

Open **🛠 Dev tools** (bottom-right corner of the app) for the switches. Switches are saved in `localStorage` and apply to the next request.

| Endpoint                | Status | How to trigger it                                                                                                                |
| ----------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/products`     | 500    | Dev tools → **Product list fails (500)**                                                                                         |
| `GET /api/products/:id` | 404    | Open a product URL that doesn't exist, e.g. `/products/nope`                                                                     |
| `POST /api/login`       | 400    | Submit with an empty or invalid email, or an empty password                                                                      |
| `POST /api/login`       | 401    | Use a wrong password                                                                                                             |
| `GET /api/me`           | 401    | Call it logged out, or Dev tools → **Session expired**                                                                           |
| `POST /api/orders`      | 400    | Send an empty cart or a quantity of 0                                                                                            |
| `POST /api/orders`      | 401    | Check out while logged out, or Dev tools → **Session expired**                                                                   |
| `POST /api/orders`      | 409    | Order more than the stock, or Dev tools → **Checkout: item sold out (409)**                                                      |
| `GET /api/orders/:id`   | 401    | Call it logged out, or Dev tools → **Session expired**                                                                           |
| `GET /api/orders/:id`   | 404    | Open an order id that doesn't exist                                                                                              |
| any                     | 500    | Dev tools → **Server outage** (tests the retry button anywhere)                                                                  |
| `POST /api/orders`      | 500    | Dev tools → **Checkout: order saved, reply lost (500)**: the order IS saved; retrying with the same `Idempotency-Key` returns it |
| `GET /api/products`     | order  | Dev tools → **Out-of-order search**: shorter searches reply later (race-condition test, D2-6)                                    |
| any                     | slow   | Dev tools → **Slow network** (+2-4 s, to see loading states)                                                                     |
