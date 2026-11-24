// Route "/dev/crash" (development tool, only when the mock API is on): throws while rendering,
// to demonstrate the error boundary's fallback screen and logging (task D4-7).
export function CrashTestPage(): never {
  throw new Error("Test render error from /dev/crash (D4-7)");
}
