// Backend errors (task D3-4): one mapping decides what every error means; raw server text is
// never what the user sees.
import { describe, expect, it } from "vitest";
import { describeError } from "./errorMessages";

describe("describeError", () => {
  it("names the item and how many are left for a 409, without using the server's message", () => {
    const result = describeError({
      status: 409,
      code: "OUT_OF_STOCK",
      message: "Insufficient stock for p-0042: requested 3, available 1",
      details: { productId: "p-0042", productName: "Glow Debug Duck #42", available: "1" },
    });
    expect(result).toMatchObject({ kind: "outOfStock", productId: "p-0042", available: 1 });
    expect(result.message).toBe('Sorry, only 1 of "Glow Debug Duck #42" is left.');
    expect(result.message).not.toContain("Insufficient");
  });

  it("tells a wrong password apart from an expired session (both are 401)", () => {
    const wrongPassword = describeError({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid credentials",
    });
    const expired = describeError({ status: 401, code: "UNAUTHORIZED", message: "bad token" });
    expect(wrongPassword.message).toBe("Email or password is incorrect.");
    expect(expired.message).toMatch(/session has expired/);
  });

  it("offers a retry for server errors and network failures, but not for a 404", () => {
    expect(describeError({ status: 500, code: "X", message: "boom" }).kind).toBe("retryable");
    expect(describeError({ status: 0, code: "NETWORK_ERROR", message: "x" }).kind).toBe(
      "retryable",
    );
    expect(describeError({ status: 404, code: "NOT_FOUND", message: "x" }).kind).toBe("notFound");
  });
});
