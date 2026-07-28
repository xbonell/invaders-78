# Player Shot Cadence — Design Spec

Date: 2026-07-29

## Intent

Align player fire cadence with the 1978 arcade ROM: bolt speed 4 px/interrupt, and a short re-fire lockout after the shot is spent (hit or leaves play), without modeling full shot-explode sprites/states.

## Decisions

| Topic | Choice |
|-------|--------|
| Bolt speed | ROM `4` px × `60` Hz → `4 * 60 * SCALE_Z` world units/s |
| Re-fire rule | Still one live bolt; plus `16/60` s lockout after every spent shot |
| Lockout trigger | Any `clearPlayerBullet` (alien, UFO, bunker, alien-shot clash, off-top) |
| Visual explode | Out of scope — bolt clears immediately; lockout is sim-only |
| `shotCount` | Still advances on clear (unchanged UFO score/direction timing) |
| Alien kill freeze | Unchanged (`FORMATION.alienHitFreeze`); orthogonal to fire lockout |

## Behavior

```
tryPlayerFire:
  if playerBullet != null → no
  if playerFireLockTimer > 0 → no
  else spawn bolt at PLAYER.bulletSpeed

clearPlayerBullet:
  null out bolt
  advance shotCount (existing)
  playerFireLockTimer = PLAYER.shotLockout  // 16/60

each tick (playing / attract as today):
  countdown playerFireLockTimer
```

## Files

| File | Change |
|------|--------|
| `src/game/constants.ts` | `bulletSpeed` from ROM; add `shotLockout: 16/60` |
| `src/game/types.ts` / `board.ts` | Per-board `playerFireLockTimer` |
| `src/game/simulation.ts` | Gate fire; start/countdown lockout on clear |
| `src/game/simulation.test.ts` (or formation tests) | Speed + lockout cases |
| Product design + ARCHITECTURE | One-line cadence note |

## Out of scope

- Player shot explode sprite / status machine (ROM status 3/5)
- Advancing `shotCount` only at EndOfBlowup
- Player ship move speed ROM alignment

## Test plan

- Unit: `PLAYER.bulletSpeed === 4 * 60 * SCALE_Z`
- Unit: after clear, fire is rejected until `shotLockout` elapses; then allowed
- Unit: existing one-shot-on-screen still holds while bolt is alive
- Manual: hold fire — feel slightly snappier full-travel shots; brief beat after hits before next bolt
