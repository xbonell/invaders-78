# Procedural shell backdrop — Design Spec

Date: 2026-07-27

## Intent

Replace `src/assets/backdrop.png` with a stylized procedural planet + space sky, baked once via Three.js and applied as the `.shell` CSS background, with **zero** ongoing backdrop cost in the game loop.

## Decisions

| Topic | Choice |
|-------|--------|
| Fidelity | Arcade-flat graphic style matching voxel playfield language (flat two-tone planet disc, hard star dots, thin cyan limb) — no craters |
| Pipeline | Off-game-canvas `WebGLRenderer` + fullscreen-triangle fragment shader → **blob** object URL → CSS `--backdrop-url` (data URLs are too large for CSS custom properties and silently fail) |
| Timing | Bake once on App mount; no resize re-bake; CSS `background-size: cover` scales |
| Resolution | Capped (e.g. 1920×1080); `antialias: false`; dispose GL resources immediately after export |
| Dim | Keep `--backdrop-dim` overlay for playfield readability |
| Game canvas | Unchanged transparent clear over `.shell` |
| Animation | None in v1 |
| Asset | Delete `backdrop.png`; favicon remains the only bitmap exception |

## Out of scope

Live per-frame shader, second camera in `GameCanvas`, planet mesh geometry, shadow-map changes, `src/game/` involvement.

## Verification

- Manual: shell shows planet + sky; entities readable through dim; no PNG 404; window resize only scales CSS
- After bake: no extra draws in `useFrame`
- `pnpm test` / `pnpm lint` / `pnpm build`
