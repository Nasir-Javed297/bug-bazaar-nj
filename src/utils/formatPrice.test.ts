import { describe, expect, it } from "vitest";
import { formatPrice } from "./formatPrice";

describe("formatPrice", () => {
  it("shows integer cents as dollars with exactly two decimals and thousands separators", () => {
    expect(formatPrice(1999)).toBe("$19.99");
    expect(formatPrice(500)).toBe("$5.00");
    expect(formatPrice(1)).toBe("$0.01");
    expect(formatPrice(0)).toBe("$0.00");
    expect(formatPrice(124900)).toBe("$1,249.00");
  });
});
