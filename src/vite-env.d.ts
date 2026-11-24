/// <reference types="vite/client" />

// Types for our environment variables. A typo like `import.meta.env.VITE_API_BASEURL`
// becomes a compile error instead of a silent `undefined`.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_MOCKS?: string;
  readonly VITE_STOCK_FEED_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
