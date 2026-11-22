# The Bug Bazaar

A small online store for developer gear (rubber ducks, mechanical keyboards, coffee and stickers), built with **React + TypeScript**. It runs entirely in the browser against a **mock API**, so no backend is needed.

> This repo started as the Week 1 _Bug Bounty Board_. The history is kept in Git.

## Quick start (under 5 minutes)

**You need:** [Node.js](https://nodejs.org/) **20 or newer** (`node -v` to check) and npm (comes with Node).

```bash
git clone https://github.com/Nasir-Javed297/bug-bounty-starter.git
cd bug-bounty-starter
npm install
npm run dev
```

Open the URL printed in the terminal (usually <http://localhost:5173>). That's it: the mock API starts automatically.

A `.env` file is **optional**. Every setting has a default. To change one, copy `.env.example` to `.env` and edit it (see [Environment variables](#environment-variables)).

## Scripts

| Command                | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Start the dev server with hot reload                       |
| `npm run build`        | Type-check, then build a production bundle into `dist/`    |
| `npm run preview`      | Serve the production build locally (run `build` first)     |
| `npm run typecheck`    | Run the TypeScript compiler in strict mode, without output |
| `npm run lint`         | Run ESLint (bugs, hooks rules, no `any`, no `@ts-ignore`)  |
| `npm run lint:fix`     | Run ESLint and auto-fix what it can                        |
| `npm run format`       | Format every file with Prettier                            |
| `npm run format:check` | Check formatting without changing files                    |
| `npm run check`        | Typecheck + lint + format check: run this before you push  |

## Environment variables

Defined in `.env.example`, typed in `src/vite-env.d.ts` and read **only** in `src/config.ts`. Vite only exposes variables that start with `VITE_` to the browser, so **never put secrets here**.

| Variable            | Default | Purpose                                                                                   |
| ------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`  | Base URL for every API request                                                            |
| `VITE_ENABLE_MOCKS` | `true`  | `true` starts the in-browser mock API (MSW). `false` turns it off (to use a real backend) |

## Folder structure

```
docs/            Written tasks: decisions, API contract, architecture...
src/
  api/           Data layer: the only code that talks to the network
  mocks/         Mock backend (MSW) for dev and tests
  store/         Redux store and slices (cart, auth)
  pages/         One component per route
  components/    Reusable UI pieces
  hooks/         Custom React hooks
  types/         Shared TypeScript types (the API contract)
  utils/         Small pure helper functions
  config.ts      Reads environment variables
  App.tsx        Header + routes
  main.tsx       Entry point: mounts React
```

## Code quality

- **TypeScript strict mode.** `any`, `@ts-ignore` and `@ts-expect-error` are lint errors.
- **ESLint** (`eslint.config.js`) catches bugs. **Prettier** (`.prettierrc.json`) handles formatting. `eslint-config-prettier` stops the two from conflicting.
- **Line endings** are normalised to LF by `.gitattributes`, so Windows and macOS produce identical diffs.
- **VS Code:** open the folder and accept the recommended extensions. Files are then formatted and lint-fixed on save (`.vscode/settings.json`).

## Commit convention

Every commit starts with its task ID, for example `D3-2: add cart page`.

## Documentation

- [`docs/decisions.md`](docs/decisions.md): what was chosen for each task, the alternatives, and why

## Troubleshooting

| Problem                                    | Fix                                                                                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` says the port is in use      | Vite picks the next free port automatically. Use the URL it prints                                                                                                      |
| `node: command not found` or syntax errors | Install Node 20 or newer                                                                                                                                                |
| `npm audit` reports advisories             | They are in dev-only tooling (the Vite dev server) and don't affect the app. Don't run `npm audit fix --force`, which can upgrade Vite to an incompatible major version |
