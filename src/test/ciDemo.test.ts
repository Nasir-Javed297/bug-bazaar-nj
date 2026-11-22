// TEMPORARY (task D4-6): a deliberately failing test, to prove that CI turns red and the
// branch protection rule on main blocks the merge. Reverted in the next commit.
import { describe, expect, it } from "vitest";
import { formatPrice } from "../utils/formatPrice";

describe("CI demo", () => {
  it("fails on purpose: a wrong expectation for a price", () => {
    expect(formatPrice(1999)).toBe("$20.00"); // wrong on purpose: it's $19.99
  });
});
