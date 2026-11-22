// Custom hook (task D2-5): state that survives a reload, ignores bad data, and syncs across tabs.
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLocalStorage } from "./useLocalStorage";

const KEY = "test:volume";
const isNumber = (value: unknown): value is number => typeof value === "number";

describe("useLocalStorage", () => {
  it("saves the value and reads it back after a 'reload' (a fresh mount)", () => {
    const first = renderHook(() => useLocalStorage(KEY, 5, isNumber));
    act(() => first.result.current[1](8));
    expect(first.result.current[0]).toBe(8);
    first.unmount();

    const afterReload = renderHook(() => useLocalStorage(KEY, 5, isNumber));
    expect(afterReload.result.current[0]).toBe(8);
  });

  it("falls back to the default when the stored value is corrupt or the wrong type", () => {
    localStorage.setItem(KEY, '"loud"'); // valid JSON, wrong type
    expect(renderHook(() => useLocalStorage(KEY, 5, isNumber)).result.current[0]).toBe(5);

    localStorage.setItem(KEY, "{not json");
    expect(renderHook(() => useLocalStorage(KEY, 5, isNumber)).result.current[0]).toBe(5);
  });

  it("picks up a change made in another browser tab", () => {
    const { result } = renderHook(() => useLocalStorage(KEY, 5, isNumber));

    // What the browser does when ANOTHER tab writes to localStorage:
    act(() => {
      localStorage.setItem(KEY, "11");
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(result.current[0]).toBe(11);
  });
});
