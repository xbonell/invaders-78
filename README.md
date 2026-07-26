# Invaders 78

1978-style arcade invaders: 2D dynamics, **voxel** ships (React Three Fiber), procedural Web Audio, keyboard + gamepad.

## Stack

Rsbuild · React · TypeScript · Three.js · React Three Fiber · Web Audio API · Gamepad API · Vitest

## Develop

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Controls

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Insert coin & 1P | 1 / Enter | Start |
| 2 players | 2 | — |
| Add credit | 5 / C | — |
| Move | ← → / A D | D-pad / left stick |
| Fire | Space / Ctrl | South (A / ×) |
| Pause | Esc | Start (in play) |

## Docs for contributors / agents

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | **Start here** — layout, conventions, backlog, how-to |
| [docs/superpowers/specs/2026-07-25-space-invaders-design.md](docs/superpowers/specs/2026-07-25-space-invaders-design.md) | Design decisions & current scope |
| [AGENTS.md](AGENTS.md) | Short agent checklist |

## Status

Shipped: core loop, attract/credits, 1P/2P, voxel art + FX, laser bullets, procedural audio.  
Next: playtest/balance, settings, or desktop/Steam packaging (see architecture backlog).
