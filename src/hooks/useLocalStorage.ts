// Like useState, but the value is also saved in localStorage: it survives a reload,
// and stays in sync between browser tabs.
//
// Generic: works for any type T. The caller passes a type guard that decides whether a stored
// value is still valid (it may come from an older version of the app, or a DevTools edit).
//
// Pass a `defaultValue` and `isValid` that are defined OUTSIDE the component (constants),
// so they're the same on every render and the storage listener isn't re-attached each time.
import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "../utils/storage";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T,
): [T, (value: T) => void] {
  // Lazy initial state: the function runs only on the first render, so storage is read once.
  const [value, setValue] = useState<T>(() => readStorage(key, isValid) ?? defaultValue);

  // State is the source of truth; storage follows it whenever the value changes.
  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);

  // When ANOTHER tab changes this key, the browser fires a "storage" event in this tab.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      setValue(readStorage(key, isValid) ?? defaultValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, isValid, defaultValue]);

  // A tuple, like useState: const [value, setValue] = useLocalStorage(...)
  return [value, setValue];
}
