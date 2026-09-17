# Task Collector

Task Collector is an Obsidian community plugin for marking, collecting, and managing tasks within notes. It is a private TypeScript/JavaScript package bundled with esbuild.

## Repository layout

- `src/` — plugin source, settings, modals, task data/API, and styles; `src/main.ts` is the entry point.
- `test/` — Vitest tests and Obsidian mocks.
- `docs/` — user-facing configuration and feature documentation.
- `manifest.json` — Obsidian plugin metadata.
- `build/` — generated production output; it is ignored by Git.

## Development

Use Node.js 22 or newer and run `npm ci` after checkout. Common commands:

- `npm test` — run the test suite.
- `npm run lint` — run Biome linting on source files.
- `npm run fix` — apply Biome formatting and fixes to `src/`.
- `npm run prebuild` — validate formatting/lint rules and run tests.
- `npm run build` — create the production bundle in `build/`.
- `npm run dev` — watch and rebuild during development; set `OUTDIR` to change the output directory.

Keep implementation changes in `src/`, add or update focused tests in `test/`, and update `README.md` or `docs/` when user-facing behavior changes.
