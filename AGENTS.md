# AGENTS.md

You are working on **Invaders 78**, a web arcade invaders game (Rsbuild, React, TypeScript, R3F, procedural audio).

## Read first

1. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — file map, conventions, backlog, how-to  
2. [docs/superpowers/specs/2026-07-25-space-invaders-design.md](docs/superpowers/specs/2026-07-25-space-invaders-design.md) — product decisions (keep in sync when behavior changes)

## Commands

- `npm run dev` — dev server  
- `npm test` — Vitest (`src/game/`)  
- `npm run build` — production build  
- `npm run preview` — preview production build  

## Rules of thumb

- Change **rules** in `src/game/` + add/update unit tests first when practical.  
- Change **look** in `src/scene/` (voxels/recipes, debris, bullets, lights).  
- Do not put Three.js / DOM / Audio inside `src/game/`.  
- Destruction VFX depend on `GameEvent`s + `fxQueue` — silent kills without events are a bug.  
- Prefer updating ARCHITECTURE.md + design spec when you ship a new subsystem.

## External docs

- Rsbuild: https://rsbuild.rs/llms.txt  
- Rspack: https://rspack.rs/llms.txt  
- R3F: https://docs.pmnd.rs/react-three-fiber  
