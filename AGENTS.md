# AGENTS.md

You are working on **Invaders 78**, a web arcade invaders game (Rsbuild, React, TypeScript, R3F, procedural audio).

## Read first

1. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — file map, conventions, backlog, how-to
2. [docs/superpowers/specs/2026-07-25-space-invaders-design.md](docs/superpowers/specs/2026-07-25-space-invaders-design.md) — product decisions (keep in sync when behavior changes)
3. [docs/superpowers/specs/2026-08-05-arcade-framework-boundaries-design.md](docs/superpowers/specs/2026-08-05-arcade-framework-boundaries-design.md) — shared kernel / render backend seams

## Commands

- `pnpm dev` — dev server
- `pnpm test` — Vitest (`src/**/*.test.ts`)
- `pnpm lint` — Oxlint (type-aware)
- `pnpm format` / `pnpm format:check` — Oxfmt
- `pnpm build` — production build
- `pnpm preview` — preview production build

## Rules of thumb

- Change **rules** in `src/games/invaders/game/` + add/update unit tests first when practical.
- Change **look** in `src/games/invaders/render/` / `scene/` (voxels/recipes, debris, bullets, lights).
- Do not put Three.js / DOM / Audio inside `src/games/invaders/game/` (or `src/arcade/`).
- Destruction VFX depend on `GameEvent`s + `fxQueue` — silent kills without events are a bug.
- Prefer updating ARCHITECTURE.md + design spec when you ship a new subsystem.
- Shared kernel lives in `src/arcade/`; host chrome in `src/shell/`; product code in `src/games/invaders/`.

## External docs

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
- R3F: https://docs.pmnd.rs/react-three-fiber
