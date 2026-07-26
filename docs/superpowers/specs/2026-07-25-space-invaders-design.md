# Invaders 78 (Web) — Design Spec

Date: 2026-07-25 · Updated: 2026-07-26

## Intent

**Invaders 78** — a 1978-style arcade invaders game with 2D playfield dynamics, **code-built voxel** ships (no bitmaps / glTF), procedural Web Audio, keyboard + gamepad. Web-first; Steam/desktop packaging is future work. Product name avoids the trademarked “Space Invaders” title.

## Current status

**Playable vertical slice + presentation + voxel polish.** Core loop, attract mode, credits, 1P/2P, lighting, debris FX, and laser bullets are in. Next work is playtest/balance, settings, or packaging — see [ARCHITECTURE.md](../../ARCHITECTURE.md#backlog).

## Decisions

| Topic | Choice |
|-------|--------|
| Rules | Near arcade-accurate |
| Camera | Fixed orthographic top-down (`up = +Z`, player at bottom) |
| Art | Pixel→voxel extrusions from classic silhouettes; no bitmaps |
| Scope shipped | v1 core + v2 attract/credits/HUD + v3 2P/tuning + voxel/FX polish |
| Bunkers | Cell erosion; taller voxel stacks |
| Architecture | Pure fixed-timestep sim + R3F view + event FX/audio |
| Bundler | Rsbuild + React + TypeScript |
| Controls flip | Left/right mapped for flipped camera (`left → +X`) |

## Architecture

```
Input (keyboard/gamepad) → GameSimulation ← FixedTimestepLoop (useGameLoop)
                              ↓ events
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
         enqueueFx        AudioEngine      (score/hi-score)
              ↓
         DebrisField (R3F) + VoxelBody scene
```

- **Simulation** (`src/game/`) — pure TS; phases, formation, collisions, scoring; emits `GameEvent`s
- **Bridge** (`src/hooks/useGameLoop.ts`) — rAF accumulator, input attach, drain events → audio + FX queue
- **Scene** (`src/scene/`) — ortho camera, voxels, bunkers, glow bullets, debris
- **HUD** (`src/app/`) — DOM overlay SCORE&lt;1&gt;/HI-SCORE/SCORE&lt;2&gt;, credits, lives
- **Audio** (`src/audio/`) — Web Audio only; unlock on first user gesture

## Gameplay

- **1P / 2P:** `1`/`Enter` = 1 credit start; `2` = two credits, alternating turns
- Player: horizontal only; one shot on screen; 3 lives each
- Invaders: 5×11; edge drop + reverse; cadence vs alive count + wave; panic when few left
- Points: squid 30, crab 20, octopus 10; UFO mystery table 50/100/150/300
- Bunkers: 4 masks, cell erase on hit
- Waves: clear → brief pause → next wave lower/faster
- Phases: `attract` → `playing` → `dying` / `waveClear` / `playerSwitch` → `gameOver` → attract
- Hi-score: `localStorage`

## Visuals

- Voxel recipes in `src/scene/voxels/recipes.ts` (sheet-accurate grids)
- Alien death debris: **orange** additive glow; full voxel shatter
- Bullets: thin additive “laser” stacks
- Lighting: low ambient + hemisphere + angled key + ground shadows
- No camera motion; no texture bitmaps

## Input

- Move always updates `moveDir` (even while dying) so releases are not lost; cleared on death/respawn
- Fire edge-triggered; AudioContext unlock awaited before start/fire when needed
- Gamepad: first connected pad; D-pad/stick + South fire + Start

## Audio

- Unlock + silent buffer prime on gesture
- March on `formationStep`: four **descending** procedural square tones (dedicated voice, sustained per step), tempo = formation cadence; SFX on hits; muted in attract for kill spam (FX still run)
- No sample assets — tune against classic reference by ear ([march music design](./2026-07-26-march-music-design.md))
- Mute toggle persisted; suspend when tab hidden

## Out of scope (still)

Steam/Tauri wrapper, online leaderboards, glTF/bitmaps/samples, ROM fonts, network multiplayer.

## Testing

```bash
npm test    # Vitest — src/game/*.test.ts
npm run build
```

Manual: attract demo explosions, 1P/2P switch, death while holding move, audio on first Enter.
