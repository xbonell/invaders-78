# Player Ship Smooth Motion + Green-Line Bounds — Design Spec

Date: 2026-07-26

## Intent

Keep constant-speed left/right steering (no accel/decel), but remove 60 Hz positional stutter on high-refresh displays. Clamp the cannon so its full silhouette stays within the green ground line.

## Decisions

| Topic | Choice |
|-------|--------|
| Smoothness | Render interpolate player X only (`lerp(prevTickX, x, alpha)`) |
| Ease in/out | None — `moveDir * PLAYER.speed` unchanged |
| Bound reference | Green ground line width, not full `PLAYFIELD` X |
| Clamp geometry | Outer ship edge on line ends (`halfLine − PLAYER.halfWidth`) |
| Scope | Player cannon only; aliens/UFO/bullets stay discrete-tick |

## Architecture

```
useGameLoop frame:
  while acc >= TICK_DT:
    prevTickX = player.x          // last authoritative X before this tick
    step(TICK_DT)
    acc -= TICK_DT
  alpha = acc / TICK_DT           // 0..1 leftover toward next tick
  renderPlayerX = lerp(prevTickX, player.x, alpha)   // display only
```

- Sim stays fixed 60 Hz; collisions and bullet spawn use authoritative `state.player.x`.
- Display path (`Playfield` / canvas) uses `renderPlayerX` for the living ship only.
- `prevTickX` persists across frames (ref); updated only inside the tick loop before each `step`. Zero-tick frames keep the last tick’s `prevTickX` and use leftover `alpha` to glide toward current — not a no-op.
- On death/respawn/reset: if `|currentX − prevTickX| > PLAYER.speed × TICK_DT × 1.5`, snap to `currentX` (skip blend) so the ship does not flash at the old position for one frame.
- Attract AI and keyboard/gamepad still set `moveDir` as today.

## Bounds

- Add `GROUND_LINE.width = PLAYFIELD.width - 1` (today’s mesh width `21`).
- Mesh and clamp share that constant.
- Allowed centre X:

```
maxAbsX = GROUND_LINE.width / 2 - PLAYER.halfWidth
player.x = clamp(player.x, -maxAbsX, +maxAbsX)
```

- Apply in `updatePlayer` (play + attract). `PLAYER.halfWidth` already matches the 10×0.14 voxel recipe.

## Out of scope

- Accel / friction / analog stick curves
- Interpolating aliens, bunkers, UFO, or projectiles
- Changing ship voxel recipe or speed constant (unless tests force a named helper)

## Testing

- Unit: after many left/right steps at edges, `|player.x| ≤ GROUND_LINE.width/2 − PLAYER.halfWidth`.
- Unit: clamp helper (or exported max) matches ground-line geometry, not `PLAYFIELD.minX/maxX`.
- Manual: hold left/right at 60+ Hz display — motion looks continuous; ship never overhangs green line.
