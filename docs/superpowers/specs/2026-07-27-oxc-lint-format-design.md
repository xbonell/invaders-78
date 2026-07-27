# OXC lint + format for Invaders 78

## Goal

Add Oxc tooling (`oxlint` + `oxfmt`) as the project linter/formatter, with type-aware linting, enforced on app and config sources.

## Decisions

| Topic | Choice |
|-------|--------|
| Scope | App/config only: `src/`, root `*.ts`/`*.json`/`*.css`; exclude `docs/`, `dist/`, `node_modules/`, `patches/` |
| Linter | `oxlint` with correctness + suspicious categories; plugins: typescript, react, unicorn, oxc, import, vitest |
| Type-aware | `options.typeAware: true` via `oxlint-tsgolint` |
| Formatter | `oxfmt` with explicit style matching current code (single quotes, semis, width 100) |
| Scripts | `lint`, `lint:fix`, `format`, `format:check` |
| Docs | Update README, AGENTS.md, ARCHITECTURE verification checklist |

## Non-goals

- Formatting / linting Markdown under `docs/`
- CI workflow files (none present yet)
- Replacing TypeScript `tsc` / Vitest

## Success

- `pnpm lint` and `pnpm format:check` pass
- `pnpm test` and `pnpm build` still green
- Contributors have documented commands
