// Accessibility (task D4-1): what screen-reader and keyboard users rely on, checked in tests so
// CI keeps it working.
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cartItem, renderApp } from "./utils";

describe("accessibility", () => {
  it("form errors are announced: alert, focus on the invalid field, error read with the field", async () => {
    const { user } = renderApp("/login");

    await user.click(screen.getByRole("button", { name: "Log in" })); // empty form -> 400

    // 1. The summary is in a role="alert" region, which screen readers announce immediately.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please check the highlighted fields.",
    );
    // 2. Focus moves to the first invalid field...
    const email = screen.getByLabelText("Email");
    await waitFor(() => expect(email).toHaveFocus());
    // 3. ...which is marked invalid, and its error is read together with it.
    expect(email).toBeInvalid();
    expect(email).toHaveAccessibleDescription("Email is required.");
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("Password is required.");
  });

  it("a repeated error is announced again (a new alert, even with the same text)", async () => {
    const { user } = renderApp("/login");
    await user.type(screen.getByLabelText("Email"), "demo@bugbazaar.dev");
    await user.type(screen.getByLabelText("Password"), "wrong-1");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    const firstAlert = await screen.findByRole("alert");
    expect(firstAlert).toHaveTextContent("Email or password is incorrect.");

    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(screen.getByRole("alert")).not.toBe(firstAlert));
    expect(screen.getByRole("alert")).toHaveTextContent("Email or password is incorrect.");
  });

  it("each page has its own title, and the cart link's name contains what's on screen", async () => {
    renderApp("/cart", { cart: [cartItem("p-0042", 2)] });
    await waitFor(() => expect(document.title).toBe("Your cart · The Bug Bazaar"));
    // Visible text is "Cart 2"; voice-control users say what they see (WCAG 2.5.3).
    expect(screen.getByRole("link", { name: "Cart 2 items" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });
});
