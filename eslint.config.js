// ESLint "flat config": an array of config objects applied in order.
// Later objects override earlier ones.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // Never lint build output or dependencies.
  { ignores: ["dist", "coverage", "node_modules", "public/mockServiceWorker.js"] },

  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Rules of Hooks (only call hooks at the top level) and correct effect dependencies.
      ...reactHooks.configs.recommended.rules,
      // Fast refresh (instant reload while editing) only works if component files export components.
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Task D1-3: no `any`, no @ts-ignore. Enforced by the linter, not just by discipline.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": true, "ts-nocheck": true },
      ],
      // Prefer `import type` for types; they disappear at build time.
      "@typescript-eslint/consistent-type-imports": "error",
      // Allow unused variables that start with _ (e.g. `_event`).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Task D1-4: all network requests go through src/api. Nothing else may call fetch directly.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/api/**", "src/mocks/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Use the data layer in src/api instead of calling fetch." },
        { name: "XMLHttpRequest", message: "Use the data layer in src/api instead." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "fetch", message: "Use the data layer in src/api instead." },
        {
          object: "globalThis",
          property: "fetch",
          message: "Use the data layer in src/api instead.",
        },
      ],
    },
  },

  // Must stay LAST: turns off every rule that would conflict with Prettier's formatting.
  prettier,
);
