# HUD / playframe align — Design Spec

Date: 2026-07-27

## Intent

Align HUD, footer, and overlay with the ortho camera’s play rectangle (horizontal and vertical). Dimmed backdrop art lives on `.shell` (`src/assets/backdrop.png`); the play canvas clears transparent so the same art shows through empty playfield.

## Decisions

| Topic | Choice |
|-------|--------|
| Approach | CSS framed `.stage` contain-fitted to play-view aspect |
| Shared frame | `PLAY_VIEW_MARGIN = 1`; width = `GROUND_LINE.width + 2×margin`; depth = `PLAYFIELD.depth + 2×margin` |
| Chrome placement | Hud + FooterBar inside `.stage`; Overlay is a `.shell` sibling so dim/attract covers the full viewport |
| Camera | Frustum = ±playViewWidth/2 × ±playViewDepth/2 (stage aspect matches; no GL letterbox) |
| HUD max-width | Remove hardcoded `52rem`; chrome spans full stage width |
| Overlay | Full-shell coverage (`inset: 0` on `.shell`); content still centered |

## Layout

```
.shell (full viewport, dimmed CSS backdrop)
  ├── .stage (contain-fit play aspect; transparent canvas)
  │     ├── GameCanvas
  │     ├── Hud
  │     └── FooterBar
  └── Overlay (full-shell dim / attract)
```

## Out of scope

HUD visual redesign, CRT overlay, changing world sim bounds, stretch-to-fill distortion.

## Verification

- Resize wide and tall viewports: stage letterboxes; score/lives edges match green-line column; overlay covers full viewport (including letterbox) with content centered
- `pnpm test` / `pnpm build`
- Camera shows full playfield + margin (no clipping of UFO/ground)
