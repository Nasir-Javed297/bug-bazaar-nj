// Custom hook (task D2-5): only the latest value comes out, and only after typing pauses.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  // Fake timers: the test moves the clock forward instead of really waiting.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns only the latest value, once it has stopped changing for the delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "d" },
    });
    expect(result.current).toBe("d");

    // Fast typing: each new value arrives before 300 ms have passed.
    rerender({ value: "du" });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: "duc" });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: "duck" });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("d"); // still waiting: nothing in between came out

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("duck"); // "du" and "duc" never appeared
  });
});
