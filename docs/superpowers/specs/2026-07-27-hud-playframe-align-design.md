# HUD / playframe align — Design Spec

Date: 2026-07-27

## Intent

Align HUD, footer, and overlay with the ortho camera’s play rectangle (horizontal and vertical). Letterbox stays black shell background outside that frame.

## Decisions

| Topic | Choice |
|-------|--------|
| Approach | CSS framed `.stage` contain-fitted to play-view aspect |
| Shared frame | `PLAY_VIEW_MARGIN = 1`; width = `GROUND_LINE.width + 2×margin`; depth = `PLAYFIELD.depth + 2×margin` |
| Chrome placement | Hud, FooterBar, Overlay nested inside `.stage` with canvas |
| Camera | Frustum = ±playViewWidth/2 × ±playViewDepth/2 (stage aspect matches; no GL letterbox) |
| HUD max-width | Remove hardcoded `52rem`; chrome spans full stage width |
| Overlay | Same play rectangle as HUD/footer |

## Layout

```
.shell (full viewport, black letterbox)
  └── .stage (contain-fit play aspect)
        ├── GameCanvas
        ├── Hud
        ├── Overlay
        └── FooterBar
```

## Out of scope

HUD visual redesign, CRT overlay, changing world sim bounds, stretch-to-fill distortion.

## Verification

- Resize wide and tall viewports: stage letterboxes; score/lives/credit edges match green-line column; overlay centered in the same box
- `pnpm test` / `pnpm build`
- Camera shows full playfield + margin (no clipping of UFO/ground)
