// Runs FIRST (vite.config.ts -> test.setupFiles), before any app module loads.
// Tests run in Node with jsdom pretending to be a browser. (The AbortSignal difference is handled
// in setup.ts, because it has to wrap fetch AFTER MSW does.)

// Storage: Node 22+ has its own global `localStorage` / `sessionStorage` (Node's Web Storage),
//    unusable unless Node is started with --localstorage-file. In Vitest's jsdom environment
//    those Node globals hide jsdom's working browser storage, so the app would see `undefined`.
//    Put jsdom's storage back. (On Node 20 this changes nothing: the jsdom ones are already there.)
const { jsdom } = globalThis as unknown as { jsdom: { window: Window } };

for (const name of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, name, {
    value: jsdom.window[name],
    configurable: true,
    writable: true,
  });
}
