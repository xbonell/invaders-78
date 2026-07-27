# UFO 3-Frame Lights Animation — Design Spec

Date: 2026-07-26

## Intent

Animate the mystery saucer with a 3-frame underside-lights chase that reverses with travel direction (~5 swaps/sec), without changing hitbox, speed, score, or spawn rules.

## Decisions

| Topic | Choice |
|-------|--------|
| Visual | Only window row changes; body rows identical |
| Frame count | 3 (not 2 like aliens) |
| Pace | Every 12 ticks @ 60 Hz ≈ 5 Hz |
| Direction | `vx > 0` → `(frame + 1) % 3`; `vx < 0` → `(frame + 2) % 3` |
| Ownership | Sim-owned `animFrame` / `animTicks` on `Ufo` |
| Render | `ufoRecipe(frame)` + `visualSig` includes frame |
| Debris | `ufoHit` carries `animFrame` |

## Window rows

- Frame 0: `.##.##.##.......`
- Frame 1: `...##.##.##.....`
- Frame 2: `.....##.##.##...`

(All 16 columns to match the saucer footprint.)

## Architecture

```
updateUfo(dt)
  → move x
  → animTicks += 1
  → while animTicks >= UFO.animIntervalTicks (12):
       subtract interval
       advance frame by travel direction
```

- Recipes: `src/scene/voxels/recipes.ts` (`ufoRecipe`, `UFO_RECIPE = ufoRecipe(0)`)
- Sim: `types.ts` / `constants.ts` / `simulation.ts`
- Display: `Playfield` `SmoothUfo` + `DebrisField`

## Out of scope

- UFO speed, score table, spawn interval, hitbox
- Motion-snapshot frame swapping
