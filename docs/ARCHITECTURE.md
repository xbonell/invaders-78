# Architecture & agent handoff

Living guide for continuing **Invaders 78**. Prefer this over older plan checklists when they conflict.

## Quick start

```bash
pnpm install
pnpm dev      # http://localhost (Rsbuild)
pnpm test     # Vitest (`src/**/*.test.ts`)
pnpm lint     # Oxlint (type-aware)
pnpm format:check
pnpm build
```

Pre-commit (`simple-git-hooks` → `lint-staged`) auto-runs `oxfmt` on staged files after `pnpm install`.

Design intent: [docs/superpowers/specs/2026-07-25-space-invaders-design.md](docs/superpowers/specs/2026-07-25-space-invaders-design.md)

Framework boundaries (Phase A): [docs/superpowers/specs/2026-08-05-arcade-framework-boundaries-design.md](docs/superpowers/specs/2026-08-05-arcade-framework-boundaries-design.md)

## Directory map

### `src/arcade/` — shared kernel

| Path | Role |
|------|------|
| `arcade/loop/` | `TICK_DT`, fixed clock, `GameSimulation` / `MotionBridge` contracts |
| `arcade/space/logicalSpace.ts` | 224×256 logical ↔ world XZ; `VOXEL_SIZE` (= `SCALE_X`) |
| `arcade/collisions/aabb.ts` | Generic AABB overlap |
| `arcade/storage/storage.ts` | Hi-score + mute `localStorage` |
| `arcade/net/` | Global high-score HTTP client + pure policy |
| `arcade/render/` | `RenderBackend` types + `createFxQueue` |

### `src/shell/` — shared host chrome

| Path | Role |
|------|------|
| `shell/input/` | Keyboard, gamepad, steer, pointer fire |
| `shell/canvas/GameCanvas.tsx` | R3F host + lights; hosts a `RenderBackend` as children |
| `shell/canvas/orthoPlayView.ts` | Contain-fit ortho frustum helpers (play size injected) |
| `shell/canvas/canvasRecovery.ts` | Host size + remount policy after fullscreen |
| `shell/backdrop/` | One-shot WebGL bake → CSS `--backdrop-url` |
| `shell/chrome/` | Pause menu, fullscreen, stage scale, `app.css` |

### `src/games/invaders/` — Space Invaders product

| Path | Role |
|------|------|
| `game/simulation.ts` | `createGame`, `dispatch`, `step`, `drainEvents` — **rules source of truth** |
| `game/simulationAdapter.ts` | Adapts `Game` to `GameSimulation` |
| `game/alienShots.ts` | Rolling / Plunger / Squiggly slots |
| `game/types.ts` | Phases, entities, `BoardState`, `GameEvent`, commands |
| `game/board.ts` | Per-player playfield slots for 2P |
| `game/constants.ts` | Tuning (`ALIEN_SHOT`, speeds, UFO, attract) |
| `game/formation.ts` | Grid spawn, march interval, bunker masks |
| `game/collisions.ts` | Bunker erosion (+ re-exports AABB) |
| `game/*.test.ts` | Unit tests — extend when changing rules |
| `motion/` | SI `MotionBridge` + display lerp helpers |
| `loop/useInvadersGameLoop.ts` | Fixed timestep + motion + event sinks |
| `scene/Playfield.tsx` | Syncs sim snapshot → meshes |
| `scene/meshes/` | Bunkers, glow bullets/shots, score floats |
| `render/voxel/` | `VoxelRenderBackend`, recipes, debris, FX queues |
| `render/lowpoly/` | Stub notes for a future low-poly backend |
| `audio/engine.ts` | Procedural Web Audio (SI character) |
| `ui/` | `InvadersApp`, Hud, overlays |

| Other | Role |
|-------|------|
| `src/index.tsx` | Mounts `InvadersApp` |
| `functions/api/high-score.ts` | Cloudflare Pages Function — persisted max score (KV) |

## Data flow

1. R3F `GameSimDriver` (`useFrame` priority -1) calls `advanceRef` so fixed-step `step(game, TICK_DT)` shares the display clock (no second `requestAnimationFrame`).
2. Invaders `MotionBridge` writes the SI pose bag; `VoxelRenderBackend` reads it in `useFrame`.
3. `drainEvents(game)` → `enqueueFx(events)` always for hits; `AudioEngine.handleEvents` when not in pure attract demo kills.
4. `DebrisField` `useFrame` calls `drainFxQueue()` and spawns particles. `ScoreFloatField` drains `scoreFloatQueue` for UFO points popups.
5. React `version` bumps when `visualSig(state)` changes — continuous motion, formation pose/anim, and audio-only events (e.g. `formationStep`) do **not** reconcile React.
6. Continuous movers (player, UFO, player bullet, alien shots): advance lerps into `motionSnapshot`; meshes set transforms in `useFrame` with **no** React position props for those axes. Formation march snaps origin + anim on the snapshot parent group; invasion fly-off lerps that same origin.
7. Flat lighting (ambient + hemisphere + directional); **no shadow maps** — formation→bunker shadows hitch with the transparent canvas + CSS backdrop path.
8. Player / UFO / aliens render as **merged recipe meshes** (`RecipeMesh`); bunkers stay per-cell; explosions still spawn from `recipeToBits`.

## Conventions (do not break casually)

- **Sim purity:** no DOM/Three/Audio inside `games/invaders/game/` (or future `games/*/game/`).
- **FX via events:** kills must `pushEvent` with `x,z` (and alien type/frame). Attract demo also emits hits (score 0) so explosions still play.
- **Graphics via RenderBackend:** playfield art lives under `games/invaders/render/`; shell `GameCanvas` stays backend-agnostic.
- **Move input:** `dispatch({ type: 'move' })` always updates `moveDir`; clear on death/respawn/`beginPlay`. Never gate move updates on `phase === 'playing'` only.
- **Gamepad:** poll **all** connected pads; opposing left/right on one pad (or across pads) are treated as idle. Combine with keyboard steer every frame (`shell/input/steer.ts`) so a ghost pad cannot wipe Steam desktop arrow keys. Face buttons use **per-pad rising edges** (stuck South on a ghost pad must not block A on another). On `"standard"` mapping use D-pad buttons 12–15 + sticks only — do **not** read axes 6/7. Fullscreen focuses `.shell` and calls `resetGamepadEdges()`. Do not await audio unlock before pad fire/Start.
- **Steam Deck desktop layout:** After fullscreen, Steam often drops Gamepad API face buttons and uses desktop keys/mouse: **A→left-click (or Enter)**, **Y→Space**, **B/Menu→Esc**. Space fire is suppressed for the rest of the session once a pad was seen; primary click on the shell fires/starts when a pad was seen (`pointerFire.ts`) so A keeps working when it is LMB.
- **Audio unlock:** first gesture must `await audio.unlock()` before start/fire that should make sound.
- **Camera:** ortho, `camera.up.set(0,0,1)`, **`manual: true`**; contain-fits play view (+ margin) in `OrthoCameraRig` / `orthoPlayView.ts`. Re-apply frustum whenever canvas CSS pixel size changes — aspect-only updates miss fullscreen (stage `aspect-ratio` is fixed) and R3F would otherwise leave a pixel-unit frustum (playfield vanishes; DOM HUD remains). Player at negative Z (screen bottom). Left key → `moveDir = 1`.
- **No bitmap game art:** recipes/code geometry only (`public/favicon.png` exempt). Shell backdrop is a one-shot procedural bake ([procedural backdrop](superpowers/specs/2026-07-27-procedural-backdrop-design.md)). All playfield voxels share square `VOXEL_SIZE` (= `SCALE_X`).
- **Controls:** see README; attract/game-over: ←→ select 1P/2P, Fire/Enter/Start confirm ([start mode selector](docs/superpowers/specs/2026-07-27-start-mode-selector-design.md)).

## How to…

### Tune difficulty

Edit `games/invaders/game/constants.ts` (`FORMATION`, `ALIEN_SHOT`, `PLAYER`, `UFO`, `ATTRACT`). Alien fire is score-reload + table/targeting in `alienShots.ts`, not a timer interval. UFO scroll-on/off uses `ufoOffscreenAbsX()` in `simulation.ts` (despawn only when fully past the green-line rim). Add/adjust tests in `alienShots.test.ts` / `formation.test.ts` / `players.test.ts` if behavior changes.

### Change alien / UFO / player / alien-shot shape

Edit grids in `games/invaders/render/voxel/recipes.ts` (`#` short voxel, `H` tall, `.` empty). All recipes use shared `VOXEL_SIZE` pitch (square cubes). `alienRecipe(type, frame)` / `alienShotRecipe(type, frame)` / `ufoRecipe(frame)` select animation frames. Debris for aliens and UFO uses orange override in `DebrisField.tsx`. Scoring UFO kills also enqueue a floating points popup via `scoreFloatQueue`.

### Add a new `GameEvent`

1. Extend union in `games/invaders/game/types.ts`
2. `pushEvent` from simulation
3. Handle in `games/invaders/audio/engine.ts` and/or `fxQueue` + `DebrisField` / UI as needed

### Add a game phase

Extend `GamePhase`, handle in `dispatch` / `step`, update HUD `Overlay`/`Hud` visibility.

### Persist / deploy hi-score

See [online high score design spec](superpowers/specs/2026-07-28-online-high-score-design.md) and `wrangler.toml` (KV binding `HI_SCORE`, `pnpm pages:deploy` / `pages:dev`). CI: `.github/workflows/deploy-pages.yml` runs checks on PRs and deploys to Cloudflare Pages on `main` (needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets and real KV ids). Use `pnpm pages:dev` for local API testing so `dist` and `/api/high-score` are served from the same Wrangler origin; `pnpm dev` plus a separate Pages Function origin needs CORS, which this Function does not implement.

## Backlog (suggested)

1. **Playtest / balance** — wave 1 feel, bunker chew, UFO rate  
2. **Settings** — volume slider, key rebind (pause menu: mute + fullscreen — 2026-07-27)  
3. **Desktop package** — Tauri or Electron for Steam later  
4. **Polish** — CRT overlay (optional), attract audio policy, pause moves sync from held keys on respawn if still held  
5. ~~Formation march~~ — descending procedural march voice on `formationStep` (2026-07-26)
6. ~~Alien shots~~ — arcade Rolling/Plunger/Squiggly slots (2026-07-26)
7. ~~Gamepad 2P start~~ — Select/Back mirrors keyboard `2` (2026-07-27)
8. ~~Start mode selector~~ — ←→ select 1P/2P, Fire/Enter/Start confirm (2026-07-27)
9. ~~Online global hi-score~~ — Cloudflare Pages + KV (2026-07-28)
10. **Phase B framework extract** — when a second title starts: `packages/arcade-core` + real second `RenderBackend` if needed ([framework boundaries](superpowers/specs/2026-08-05-arcade-framework-boundaries-design.md))

## Explicit non-goals

Online multiplayer, named / top-N online leaderboards (single global max is shipped), ROM assets, glTF pipelines, rewriting sim inside `useFrame`. Phase A does **not** ship a second game, a publishable package, or a second graphics backend.

## Verification checklist for agents

- [ ] `pnpm test` green  
- [ ] `pnpm lint` green  
- [ ] `pnpm format:check` green  
- [ ] `pnpm build` green  
- [ ] Manual: Space/Enter/Start confirms menu selection (default 1P; ←→ for 2P); kill shows orange alien debris; UFO kill shows orange debris + floating points; die while holding ←/→ then release during death — no slide on respawn  
- [ ] Attract demo kills still explode  
