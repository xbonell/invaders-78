# Invaders 78

1978-style arcade invaders: 2D dynamics, **voxel** ships (React Three Fiber), procedural Web Audio, keyboard + gamepad.

## Stack

Rsbuild · React · TypeScript · Three.js · React Three Fiber · Web Audio API · Gamepad API · Vitest · Oxc (oxlint / oxfmt)

## Develop

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm format:check
pnpm build
```

## Controls

| Action        | Keyboard      | Gamepad              |
| ------------- | ------------- | -------------------- |
| Select mode   | ← → / A D     | D-pad / left stick   |
| Confirm start | Space / Enter | South (A) / Start    |
| Move          | ← → / A D     | D-pad / left stick   |
| Fire          | Space / Ctrl  | South (A / ×)        |
| Pause         | Esc           | Start (in play)      |
| Pause menu    | ↑↓ · Enter    | D-pad/stick Y · A    |
| Resume        | Esc           | Start (while paused) |

## Docs for contributors / agents

| Doc                                                                                                                      | Purpose                                               |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                                                                             | **Start here** — layout, conventions, backlog, how-to |
| [docs/superpowers/specs/2026-07-25-space-invaders-design.md](docs/superpowers/specs/2026-07-25-space-invaders-design.md) | Design decisions & current scope                      |
| [AGENTS.md](AGENTS.md)                                                                                                   | Short agent checklist                                 |

## Status

Shipped: core loop, attract mode, free 1P/2P start, voxel art + FX, laser bullets, procedural audio.  
Next: playtest/balance, settings, or desktop/Steam packaging (see architecture backlog).

## Deploy (Cloudflare Pages)

1. Create a Cloudflare Pages project linked to this repo (build: `pnpm build`, output: `dist`).
2. Create KV namespace `HI_SCORE` and bind it to the Pages project as `HI_SCORE` (see `wrangler.toml`).
3. Deploy: `pnpm pages:deploy` (or GitHub integration on push to `main`).
4. Optional local API: set `PUBLIC_HIGH_SCORE_API` to the `wrangler pages dev` origin when running `pnpm dev`.

Global Hi-Score uses `GET`/`PUT /api/high-score`. Offline play still uses `localStorage`.
