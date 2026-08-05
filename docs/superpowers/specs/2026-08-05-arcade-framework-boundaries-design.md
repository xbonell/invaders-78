# Arcade framework boundaries (Phase A)

Date: 2026-08-05

## Intent

Carve **SI-shaped framework seams** inside Invaders 78 so a future series of vertical shooters (Galaxian, Galaga, Exerion, …) can share a kernel and swap Three.js-powered graphics backends — without extracting a package or building a second game yet.

## Decisions

| Topic | Choice |
|-------|--------|
| Sequencing | **Phase A now → Phase B later**: in-repo boundaries first; monorepo/`packages/arcade-core` only when a second title forces it |
| Graphics | Define `RenderBackend`; migrate the voxel pipeline behind it. Low-poly is **docs stub only** |
| Abstraction depth | Extract only what Invaders already proves. Next games are mental checks, not Phase A requirements |
| Entity model | No ECS / universal `Entity`. Each game keeps its own state + event unions |
| Gameplay | Refactor + seams only — Invaders behavior unchanged |

## Target layout

```
src/
  arcade/                 # shared kernel (proven generic)
    loop/                 # fixed timestep, GameSimulation / MotionBridge contracts
    space/                # logical playfield ↔ world XZ
    collisions/           # AABB primitives
    storage/              # local hi-score + mute
    net/                  # global hi-score HTTP + policy
    render/               # RenderBackend types + FX event-bridge contracts
  shell/                  # shared host chrome
    input/                # keyboard, gamepad, steer, pointer fire
    canvas/               # GameCanvas, ortho helpers, context recovery
    backdrop/             # procedural CSS backdrop bake
    chrome/               # fullscreen, pause menu, stage scale, CSS
  games/invaders/         # Space Invaders product
    game/                 # pure sim (types, step, formation, bunkers, UFO…)
    motion/               # SI MotionBridge (snapshot + capture/write)
    scene/                # Playfield composition (bunkers, bullets, …)
    render/voxel/         # VoxelRenderBackend (recipes, debris, FX queues)
    audio/                # SI-character procedural voices
    ui/                   # Hud, overlays, InvadersApp composition
    loop/                 # invaders game loop wired to arcade contracts
```

## Core contracts

### `GameSimulation`

Thin façade over `create` / `dispatch` / `step` / `drainEvents` / readable state. Invaders keeps `BoardState` / `GameEvent` / `GameCommand` as SI-specific unions.

### `MotionBridge`

Game-owned pose bag written each tick. Today's `MotionSnapshot` stays SI-shaped but lives under `games/invaders/motion/`, not in the shared loop.

### `RenderBackend`

R3F scene subtree (+ any `useFrame` consumers) that reads motion + handles drained destruction events. Phase A ships **only** `VoxelRenderBackend`. A future low-poly backend would build extruded / low-poly meshes from the same silhouette recipes (or game-specific meshes) without touching sim.

### Shell

Input → commands, audio unlock plumbing, ortho canvas host, pause/fullscreen chrome. Invaders-specific HUD copy and phases live under `games/invaders/ui`.

## Data flow

```
shell/input → GameCommand
     ↓
arcade/loop + games/invaders GameSimulation.step
     ↓
GameEvent ──► invaders audio
         └──► RenderBackend.onEvents (voxel FX / score floats)
MotionBridge.write ──► RenderBackend (useFrame poses)
shell/GameCanvas hosts RenderBackend scene subtree
```

## Explicit non-goals (Phase A)

- No pnpm workspace package / publishable library
- No second graphics backend implementation
- No Galaxian dive AI / Galaga dual ship / Exerion scroll camera
- No ECS or universal entity model
- No Invaders gameplay/behavior changes

## Phase B trigger

When starting Galaxian (or sibling): extract `src/arcade` (+ shell contracts) to `packages/arcade-core`, add `games/galaxian`, and implement a real second `RenderBackend` if that title needs low-poly.

## Low-poly backend (stub)

A future `LowPolyRenderBackend` would:

1. Implement the same `RenderBackend` contract (scene subtree + event FX).
2. Replace voxel merged boxes with low-poly meshes inspired by classic 2D bitmaps (extruded silhouettes, faceted ships).
3. Keep consuming `MotionBridge` poses and `GameEvent` hit positions — sim stays graphics-agnostic.

## Verification

- `pnpm test` / `lint` / `format:check` / `build` green
- Manual smoke: attract, 1P start, alien/UFO kill FX, pause, mute — same as today
