# Architecture & agent handoff

Living guide for continuing **Invaders 78**. Prefer this over older plan checklists when they conflict.

## Quick start

```bash
pnpm install
pnpm dev      # http://localhost (Rsbuild)
pnpm test     # Vitest, game sim only
pnpm build
```

Design intent: [docs/superpowers/specs/2026-07-25-space-invaders-design.md](docs/superpowers/specs/2026-07-25-space-invaders-design.md)

## Directory map

| Path | Role |
|------|------|
| `src/game/simulation.ts` | `createGame`, `dispatch`, `step`, `drainEvents` — **source of truth for rules** |
| `src/game/alienShots.ts` | Rolling / Plunger / Squiggly slots, reload, patterns, collisions |
| `src/game/logicalSpace.ts` | 224×256 logical ↔ world XZ conversion |
| `src/game/types.ts` | Phases, entities, `GameEvent`, commands |
| `src/game/constants.ts` | Tuning (`ALIEN_SHOT`, speeds, UFO table, attract timers) |
| `src/game/formation.ts` | Grid spawn, march interval, bunker masks |
| `src/game/collisions.ts` | AABB + bunker cell erosion |
| `src/game/storage.ts` | Hi-score + mute `localStorage` |
| `src/game/*.test.ts` | Unit tests — extend when changing rules |
| `src/hooks/useGameLoop.ts` | Fixed timestep + motion snapshot; advanced from R3F `GameSimDriver` (shared display clock) |
| `src/game/playerRender.ts` | Display lerp helpers + `MotionSnapshot` (R3F `useFrame` applies X) |
| `src/input/` | Keyboard, gamepad, credit/start helpers |
| `src/audio/engine.ts` | Procedural Web Audio (SFX + descending formation march) |
| `src/scene/GameCanvas.tsx` | R3F canvas, lights, shadows |
| `src/scene/Playfield.tsx` | Syncs sim snapshot → meshes |
| `src/scene/voxels/recipes.ts` | Pixel grids → voxel bits (aliens, player, UFO) |
| `src/scene/voxels/mergedGeometry.ts` | Cached merged BufferGeometry per recipe (movers) |
| `src/scene/voxels/RecipeMesh.tsx` | Single-mesh silhouette for player / UFO / aliens |
| `src/scene/voxels/VoxelBody.tsx` | Per-box meshes (unused by Playfield; bits still for FX) |
| `src/scene/voxels/DebrisField.tsx` | Instanced additive debris |
| `src/scene/voxels/fxQueue.ts` | Destruction events queue (not React state) |
| `src/scene/meshes/GlowBullet.tsx` | Laser bolt visuals |
| `src/scene/meshes/BunkerMesh.tsx` | Erodable bunker cells (per-cell boxes) |
| `src/app/` | Shell, HUD, overlays, CSS |

## Data flow

1. R3F `GameSimDriver` (`useFrame` priority -1) calls `advanceRef` so fixed-step `step(game, TICK_DT)` shares the display clock (no second `requestAnimationFrame`).
2. `drainEvents(game)` → `enqueueFx(events)` always for hits; `AudioEngine.handleEvents` when not in pure attract demo kills.
3. `DebrisField` `useFrame` calls `drainFxQueue()` and spawns particles.
4. React `version` bumps when `visualSig(state)` changes or events fire — continuous player/UFO/bullet motion does **not** reconcile React.
5. Continuous movers (player, UFO, player bullet, alien shots): advance lerps into `motionSnapshot`; meshes set transforms in `useFrame` with **no** React position props for those axes. Alien march stays discrete; invasion fly-off lerps formation origin via an offset group.
6. Scene uses flat lighting (no shadow maps) so hundreds of voxel boxes do not hitch the frame.
7. Player / UFO / aliens render as **merged recipe meshes** (`RecipeMesh`); bunkers stay per-cell; explosions still spawn from `recipeToBits`.

## Conventions (do not break casually)

- **Sim purity:** no DOM/Three/Audio inside `src/game/`.
- **FX via events:** kills must `pushEvent` with `x,z` (and alien type/frame). Attract demo also emits hits (score 0) so explosions still play.
- **Move input:** `dispatch({ type: 'move' })` always updates `moveDir`; clear on death/respawn. Never gate move updates on `phase === 'playing'` only.
- **Audio unlock:** first gesture must `await audio.unlock()` before start/fire that should make sound.
- **Camera:** ortho, `camera.up.set(0,0,1)`; contain-fits `PLAYFIELD` (+ margin); player at negative Z (screen bottom). Left key → `moveDir = 1`.
- **No bitmap game art:** recipes/code geometry only (favicon exempt).
- **Controls:** see README; 2P is key `2`, not gamepad yet.

## How to…

### Tune difficulty

Edit `src/game/constants.ts` (`FORMATION`, `ALIEN_SHOT`, `PLAYER`, `UFO`, `ATTRACT`). Alien fire is score-reload + table/targeting in `alienShots.ts`, not a timer interval. Add/adjust tests in `alienShots.test.ts` / `formation.test.ts` / `players.test.ts` if behavior changes.

### Change alien / UFO / player / alien-shot shape

Edit grids in `src/scene/voxels/recipes.ts` (`#` short voxel, `H` tall, `.` empty). `alienRecipe(type, frame)` / `alienShotRecipe(type, frame)` select animation frames. Debris for aliens uses orange override in `DebrisField.tsx`.

### Add a new `GameEvent`

1. Extend union in `types.ts`
2. `pushEvent` from simulation
3. Handle in `audio/engine.ts` and/or `fxQueue` + `DebrisField` / UI as needed

### Add a game phase

Extend `GamePhase`, handle in `dispatch` / `step`, update HUD `Overlay`/`Hud` visibility.

## Backlog (suggested)

1. **Playtest / balance** — wave 1 feel, bunker chew, UFO rate  
2. **Settings** — volume slider, mute default, key rebind, fullscreen  
3. **Gamepad 2P start** — mirror keyboard `2`  
4. **Desktop package** — Tauri or Electron for Steam later  
5. **Polish** — CRT overlay (optional), attract audio policy, pause moves sync from held keys on respawn if still held  
6. ~~Formation march~~ — descending procedural march voice on `formationStep` (2026-07-26)
7. ~~Alien shots~~ — arcade Rolling/Plunger/Squiggly slots (2026-07-26)

## Explicit non-goals

Online multiplayer, ROM assets, glTF pipelines, rewriting sim inside `useFrame`.

## Verification checklist for agents

- [ ] `pnpm test` green  
- [ ] `pnpm build` green  
- [ ] Manual: Enter starts with sound; kill shows orange alien debris; die while holding ←/→ then release during death — no slide on respawn  
- [ ] Attract demo kills still explode  
