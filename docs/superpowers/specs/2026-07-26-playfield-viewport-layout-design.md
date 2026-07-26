# Playfield viewport layout — Design Spec

Date: 2026-07-26

## Intent

Use more of the visible playfield: wider green baseline (player can travel that far), player/bunkers/ground closer to the bottom, alien formation (and UFO) starting higher. Frame the ortho camera on the playfield so content fills the view with a small margin; leftover letterbox matches playfield black (not arcade blue).

## Decisions

| Topic | Choice |
|-------|--------|
| Approach | Retune world layout constants + camera fit-to-playfield |
| Width | Modest widen: `PLAYFIELD.width` **22 → 28** (`minX/maxX` ±14) |
| Depth | Keep **26** (`minZ/maxZ` ±12); redistribute Z positions inside it |
| Ground / clamp | `GROUND_LINE.width = PLAYFIELD.width - 1`; `playerMaxAbsX()` unchanged formula |
| Player / bunkers | Lower toward bottom (`PLAYER.z`, `BUNKER.z`) |
| Formation / UFO | Raise `FORMATION.startOriginZ`, `UFO.z` toward top |
| Formation X | Keep 11-col span centered (`startOriginX` unchanged) |
| Camera | Contain-fit playfield (+ ~1 unit margin) from aspect; drop fixed `viewH = 28` |
| Canvas / stage bg | Match playfield black (`#050505` / `#000`) |
| Logical overlay | Keep 224×256; `SCALE_X`/`SCALE_Z` follow `PLAYFIELD` |
| Responsive bounds | **No** — world size stays fixed (not viewport-derived) |

## Target layout (world units)

| Constant | Before | After |
|----------|--------|-------|
| `PLAYFIELD.width` / `minX`/`maxX` | 22 / ±11 | **28 / ±14** |
| `PLAYFIELD.depth` / `minZ`/`maxZ` | 26 / ±12 | unchanged |
| `PLAYER.z` | -10 | **-11** |
| `BUNKER.z` | -8 | **-9** |
| `FORMATION.startOriginZ` | 6.2 | **9.2** |
| `UFO.z` | 11 | **11.2** |
| `GROUND_LINE.width` | 21 | **27** (derived) |

Relative rules (march step, drop, wave drop, shot logic) unchanged aside from bounds.

## Out of scope

Stretch-to-fill distortion, viewport-sized sim bounds, HUD redesign, CRT overlay.

## Verification

- `pnpm test` — clamp / edge tests use `PLAYFIELD` / `GROUND_LINE` (no hard-coded `11`)
- `pnpm build`
- Manual: ground spans wider; ship reaches line ends; formation starts higher; less empty void top/bottom; no blue side bars
