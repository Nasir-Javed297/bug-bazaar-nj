import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // MSW is loaded with a dynamic import() (src/main.tsx), so Vite would only discover it after
    // the page starts, then re-bundle and force a full page reload. Listing it here pre-bundles it
    // when the dev server starts instead.
    include: ["msw", "msw/browser"],
  },
});
