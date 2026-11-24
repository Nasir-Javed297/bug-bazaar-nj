// UI states and unexpected errors (tasks D2-3, D3-4, D4-7).
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { readErrorLog } from "../monitoring/logger";
import { renderApp, setScenarios } from "./utils";

describe("UI states", () => {
  it("a server error shows a friendly message with Try again, and retrying recovers", async () => {
    setScenarios({ failProductList: true });
    const { user } = renderApp("/");

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load the products");
    expect(screen.queryByText(/Product query failed/)).not.toBeInTheDocument(); // no raw text

    setScenarios({});
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("5000 products")).toBeInTheDocument();
  });

  it("a product that doesn't exist shows Not Found, not an error", async () => {
    renderApp("/products/nope");
    expect(await screen.findByRole("heading", { name: "Product not found" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("a component that crashes shows the fallback screen and the error is logged", () => {
    const silence = vi.spyOn(console, "error").mockImplementation(() => {}); // expected noise
    function Broken(): never {
      throw new Error("Boom while rendering");
    }

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.queryByText(/Boom while rendering/)).not.toBeInTheDocument(); // no raw text
    const [entry] = readErrorLog();
    expect(entry).toMatchObject({ source: "render", message: "Boom while rendering" });
    expect(screen.getByText(entry!.id)).toBeInTheDocument(); // the reference shown to the user
    silence.mockRestore();
  });
});
