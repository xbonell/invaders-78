# Global Motion Smoothness — Design Spec

Date: 2026-07-26

## Intent

Remove display stutter for all continuous movers on high-refresh displays, while keeping the classic stepped alien march. Smooth the formation only during invasion fly-off.

## Decisions

| Topic | Choice |
|-------|--------|
| Pattern | Extend `MotionSnapshot` + R3F `useFrame` (same as player/UFO) |
| Alien march | Discrete snap via `MotionSnapshot` parent origin (no React remount) |
| Invasion fly-off | Lerp formation origin on the same parent group |
| Player bullet | Lerp X/Z; snap spawn/despawn |
| Alien shots | Lerp world X/Z between ticks; snap spawn/despawn |
| Sim / collisions | Authoritative `game.state` only — never display lerp |
| Clock | Existing `GameSimDriver` shared display clock |

## Architecture

```
GameSimDriver useFrame(-1):
  before each tick: stash prev player/UFO/bullet/shots/formationOrigin
  step(TICK_DT) × N
  alpha = acc/TICK_DT
  writeMotionSnapshot(snap, prev, state, alpha)

mesh useFrame(0):
  read snap → group.position (no React position props for smoothed axes)
```

Invasion / march rendering: aliens sit at col/row offsets under a parent at `formationDisp`; anim frame updates local state only.

## Out of scope

- Gliding alien march during normal play/attract
- Changing shot step rates, speeds, or collision rules
- Debris (already useFrame)

## Testing

- Unit: optional-entity blend (spawn snap, despawn hide, 120 Hz steps)
- Unit: invasion origin blend within maxBlend; snap when not invading
- `pnpm test` / `pnpm build`
- Manual: hold fire while strafing; alien shots descend smoothly; march still steps; invasion flies off smoothly
