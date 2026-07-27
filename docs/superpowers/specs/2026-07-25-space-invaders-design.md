# Invaders 78 (Web) — Design Spec

Date: 2026-07-25 · Updated: 2026-07-27

## Intent

**Invaders 78** — a 1978-style arcade invaders game with 2D playfield dynamics, **code-built voxel** ships (no bitmaps / glTF), procedural Web Audio, keyboard + gamepad. Web-first; Steam/desktop packaging is future work. Product name avoids the trademarked “Space Invaders” title.

## Current status

**Playable vertical slice + presentation + voxel polish.** Core loop, attract mode, free 1P/2P start, lighting, debris FX, and laser bullets are in. Next work is playtest/balance, settings, or packaging — see [ARCHITECTURE.md](../../ARCHITECTURE.md#backlog).

## Decisions

| Topic | Choice |
|-------|--------|
| Rules | Near arcade-accurate |
| Camera | Orthographic top-down (`up = +Z`, player at bottom); contain-fits playfield |
| Art | Pixel→voxel extrusions from classic silhouettes; no bitmaps |
| Scope shipped | v1 core + v2 attract/HUD + v3 2P/tuning + voxel/FX polish |
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
- **HUD** (`src/app/`) — DOM overlay SCORE&lt;1&gt;/HI-SCORE/SCORE&lt;2&gt;, lives
- **Audio** (`src/audio/`) — Web Audio only; unlock on first user gesture

## Gameplay

- **1P / 2P:** attract/game-over mode selector (default 1P); ←→ / A D / pad select; Fire / Enter / Start confirm; alternating turns; no coin/credit gate ([start mode selector](./2026-07-27-start-mode-selector-design.md))
- **2P boards:** each player has an isolated board (formation, bunkers, wave, shots); switch after every death if the other still has lives; invasion ends only the active player’s remaining lives ([alternating 2P boards](./2026-07-27-alternating-2p-boards-design.md))
- Player: horizontal only; one shot on screen; 3 lives each; bonus life at 1500
- Invaders: 5×11 at ROM 16×16 pitch; start from ref ($38,$78) + wave Yr table; edge drop + reverse; step cadence = alive/60; last alien 3 px right / 2 px left; ~16-frame freeze on kill
- Points: squid 30, crab 20, octopus 10; UFO ROM table (15 values); spawn ~25.6 s when ≥8 aliens; direction from shot LSB; scrolls on/off past the green-line rim (shootable while partially visible); UFO kill shows floating points at hit location
- Bunkers: 4 at ROM VRAM slots; ROM 22×16 pixel masks; cell erase on hit
- Waves: clear → brief pause → next wave at ROM start Yr
- Phases: `attract` → `playing` → `dying` / `waveClear` / `playerSwitch` → `gameOver` → attract
- Hi-score: `localStorage`
- Layout: arcade Xr/Yr via [`arcadeLayout.ts`](../../../src/game/arcadeLayout.ts) (not the old feel-tuned constants)

## Visuals

- Visuals: playfield framed by contain-fit ortho camera; dimmed backdrop (`src/assets/backdrop.png`) on `.shell` shows through a transparent canvas (see [playfield viewport layout](./2026-07-26-playfield-viewport-layout-design.md))
- Voxel recipes in `src/scene/voxels/recipes.ts` (sheet-accurate grids; shared square `VOXEL_SIZE` reticle — see [unified voxel grid](./2026-07-27-unified-voxel-grid-design.md))
- Alien / UFO death debris: **orange** additive glow; full voxel shatter
- UFO kill: floating points number rises and fades at hit location (scoring hits only)
- Bullets: grid-locked voxel stacks with soft additive glow (no pulse scale)
- Lighting: low ambient + hemisphere + angled key (no shadow maps — hitch with transparent canvas + backdrop)
- Palette: aliens/shot voxels `#ffffff`; player/bunkers/HUD accent `#22e35a` (recipes + `--color-accent`; [vivid entity colors](./2026-07-27-vivid-entity-colors-design.md))
- No camera motion; no bitmap ship art (backdrop + favicon exempt)

## Input

- Move always updates `moveDir` (even while dying) so releases are not lost; cleared on death/respawn
- Fire edge-triggered; AudioContext unlock awaited before start/fire when needed
- Attract / game over: horizontal input selects 1P/2P (`menuPlayerCount`); Fire / Enter / Start confirms; confirm press is consumed until release so it does not fire on frame one
- Gamepad: first connected pad; D-pad/stick + South fire + Start
- Pause menu: ↑↓ / pad vertical navigate; Enter / South confirm; Esc / Start always resume ([pause menu design](./2026-07-27-pause-menu-design.md))

## Audio

- Unlock + silent buffer prime on gesture
- March on `formationStep`: four **descending** procedural square tones (dedicated voice, sustained per step), tempo = formation cadence; SFX on hits; muted in attract for kill spam (FX still run)
- No sample assets — tune against classic reference by ear ([march music design](./2026-07-26-march-music-design.md))
- Mute toggle persisted (pause menu); suspend when tab hidden

## Out of scope (still)

Steam/Tauri wrapper, online leaderboards, glTF/bitmaps/samples, ROM fonts, network multiplayer.

## Testing

```bash
pnpm test    # Vitest — src/game/*.test.ts
pnpm build
```

Manual: attract demo explosions, mode selector → 1P/2P alternating boards after each death, death while holding move, audio on first confirm.
