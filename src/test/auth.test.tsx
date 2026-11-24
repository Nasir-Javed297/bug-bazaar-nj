// Login (tasks D3-3, D4-5): used through the real form, checked by what the user sees.
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "./setup";
import { cartItem, demoSession, renderApp, setScenarios } from "./utils";

describe("logging in", () => {
  it("opening checkout while logged out goes to the login page, then back to checkout", async () => {
    const { user } = renderApp("/checkout", { cart: [cartItem("p-0100", 1)] });

    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "demo@bugbazaar.dev");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("heading", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/checkout");
    expect(screen.getByRole("link", { name: /Hi, Demo/ })).toBeInTheDocument();
  });

  it("a wrong password shows a clear message and does not log in", async () => {
    const { user, store } = renderApp("/login");

    await user.type(screen.getByLabelText("Email"), "demo@bugbazaar.dev");
    await user.type(screen.getByLabelText("Password"), "not-my-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    expect(store.getState().auth.session).toBeNull();
  });

  it("submitting the form twice in the same instant sends only one login request", async () => {
    let loginRequests = 0;
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/login")) loginRequests += 1;
    });
    const { user } = renderApp("/login");
    await user.type(screen.getByLabelText("Email"), "demo@bugbazaar.dev");
    await user.type(screen.getByLabelText("Password"), "password123");

    // Two submits before React can re-render (a double Enter / double click).
    const form = screen.getByRole("button", { name: "Log in" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(await screen.findByRole("heading", { name: "Your account" })).toBeInTheDocument();
    expect(loginRequests).toBe(1);
  });

  it("a 401 from the server signs the user out and asks them to log in again", async () => {
    setScenarios({ expireSession: true });
    const { store } = renderApp("/account", { session: demoSession() });

    expect(
      await screen.findByText("Your session has expired. Please log in again."),
    ).toBeInTheDocument();
    await waitFor(() => expect(store.getState().auth.session).toBeNull());
    expect(sessionStorage.getItem("bug-bazaar:session")).toBeNull();
  });
});
