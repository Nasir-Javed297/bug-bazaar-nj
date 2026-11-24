// Returns `value`, but only after it has stopped changing for `delayMs`.
// Typing "keyboard" changes the value 8 times; the debounced value changes once.
//
// Generic: works for any type (a search string, a number from a slider, a filters object...).
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Start a timer for the latest value...
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    // ...and if the value changes before it fires, React runs this cleanup first,
    // which cancels it. Only a value that stays still for the full delay gets through.
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
