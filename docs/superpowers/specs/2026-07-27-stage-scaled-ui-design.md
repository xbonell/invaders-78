# Stage-scaled UI CSS — Design Spec

Date: 2026-07-27

## Intent

DOM chrome (HUD, footer, overlays, score sprites) must scale with the contain-fitted play `.stage`, and match arcade HUD proportions — score digits roughly alien-tall (~10–12% of frame height for the score block), not browser-default rem.

## Decisions

| Topic | Choice |
|-------|--------|
| Scale reference | Framed stage width (same box as the canvas) |
| Tokens | `--stage-aspect` from `playViewAspect()`; `--stage-w` measured from `.stage`; `--chrome-scale = stage-w / CHROME_REF_WIDTH_PX` (`800`, shared in [`chromeScale.ts`](../../../src/app/chromeScale.ts) + CSS `--chrome-ref`) |
| How text scales | `zoom: var(--chrome-scale)` on `.hud`, `.footer-bar`, `.overlay-panel` (bypasses min font-size) |
| Design units | rem at zoom 1; zoom + larger rem sizes for arcade weight |
| Overlay | Full-shell dim/attract unzoomed; content in `.overlay-panel` |
| Reference look | [Arcade gameplay still](https://upload.wikimedia.org/wikipedia/en/2/20/SpaceInvaders-Gameplay.gif) — digit height ≈ alien |

## Calibration

`CHROME_REF_WIDTH_PX = 800` — slight bump from 880. Score values `1.15rem` / labels `0.75rem`.

## Out of scope

HUD visual redesign (layout/copy), CRT overlay, moving Overlay into `.stage`, sim/camera changes.

## Verification

- Score / lives / attract type clearly larger relative to aliens than pre-change
- Shrink window height: chrome still tracks stage
- `pnpm lint` / `pnpm test` / `pnpm build`
