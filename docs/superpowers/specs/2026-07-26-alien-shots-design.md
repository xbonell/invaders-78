# Alien Projectile System — Design Spec

Date: 2026-07-26

## Intent

Replace the random/timer `alienBullets[]` pool with an arcade-authentic three-slot alien shot system (Rolling, Plunger, Squiggly): fixed concurrency, score-based reload, table/targeting fire, late-wave speed, deterministic tests.

## Decisions

| Topic | Choice |
|-------|--------|
| Coordinates | Logical 224×256 overlay; player/aliens/UFO stay in float world |
| Bunker hits | Swept 1-logical-px steps → existing 16×12 cell erosion |
| Visuals | Voxel recipes traced from Wikimedia bullet strip (no bitmaps) |
| UFO lock | Squiggly shares slot with UFO (`arcadeAuthenticUfoShotSlotSharing: true`) |
| Pattern reset | Reset plunger/squiggly table pointers each wave |
| Debug overlay UI | Out of scope; structured debug events + serializable state only |

## Architecture

```
step() 60Hz
  → set squigglySlotLockedByUfo from UFO presence
  → updateAlienShots(game)   // one slot per frame (round-robin)
       Idle → attemptSpawn
       Active → move 4/5 logical px + swept collisions
       Exploding → countdown → Idle
  → logicalToWorld for Playfield VoxelBody render
```

- Pure sim in `src/game/alienShots.ts` + `logicalSpace.ts`.
- No Audio/DOM/Three inside `src/game/`.
- Player bullet remains world-float; mutual collision with alien slots inside active-slot processing.

## Coordinate bridge

```
LOGICAL_W = 224, LOGICAL_H = 256
scaleX = PLAYFIELD.width / 224
scaleZ = PLAYFIELD.depth / 256
world.x = PLAYFIELD.minX + logical.x * scaleX
world.z = PLAYFIELD.maxZ - logical.y * scaleZ   // arcade +Y down → game −Z
```

## Shot types

| Type | Column select | Extra rules |
|------|---------------|-------------|
| Rolling | Occupied column nearest player centre X (tie → lower index) | Enabled if ≥1 alien |
| Plunger | `COLUMN_FIRE_TABLE[0..15]` | Disabled when 1 alien left |
| Squiggly | `COLUMN_FIRE_TABLE[6..20]` | Locked while UFO active |

Empty column: wrap rightward; only lowest living alien in column fires.

## Movement

- One slot processed per 60 Hz frame; that visit = one movement step (no extra 3-frame delay).
- Step = 4 px if remaining aliens > 8, else 5.
- Shared for all types.

## Reload

Compare min of other slots’ `moveCounter` (idle → 255) against score threshold: 48 / 16 / 11 / 8 / 7 for score `<200` / `<1000` / `<2000` / `<3000` / else.

## Collision order (swept)

1. Player bullet → both clear/explode, no player damage  
2. Bunker cell → erode, shot Exploding  
3. Player → Exploding + `hitPlayer`  
4. Bottom boundary → Exploding  

## Lifecycle

- Wave start: reset slots, patterns, UFO lock  
- Player death: clear slots to idle; keep pattern pointers  

## Visuals

12 frames from strip left→right: Squiggly×4, Rolling×4, Plunger×4 (5×10 ASCII → voxel recipes). Animate one frame per movement step while Active.

## Testing

Vitest in `alienShots.test.ts` covering speed, concurrency, round-robin, tables, targeting, reload, UFO lock, swept bunker, scenarios A–E. Existing sim tests that injected `alienBullets` use slot helpers.

## Out of scope

Full logical migration, pixel-mask bunkers, on-screen debug overlay UI.
