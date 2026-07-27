# UFO 3-Frame Lights Animation Implementation Plan

> **For agentic workers:** Use executing-plans or implement task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Animate the mystery saucer with a 3-frame underside-lights chase that reverses with movement direction (~5 swaps/sec).

**Architecture:** Sim owns `animFrame` / timer on `Ufo` (like alien-shot frames). Recipes in `recipes.ts`; Playfield swaps via `ufoRecipe(frame)` when `visualSig` includes the frame; debris uses the frame from `ufoHit`.

**Tech Stack:** Existing TypeScript sim + R3F `RecipeMesh` / voxel recipes.

## Locked design

- Body rows identical; only window row changes:
  - Frame 0: `.##.##.##......`
  - Frame 1: `...##.##.##....`
  - Frame 2: `.....##.##.##..`
- Advance every **12 ticks** (12/60 s ≈ 5 Hz)
- `vx > 0`: `(frame + 1) % 3`; `vx < 0`: `(frame + 2) % 3`
- Reset frame/timer on spawn; hitbox unchanged
- Keep `UFO_RECIPE` as alias of frame 0 for any leftover imports

## Files

- Create: `docs/superpowers/specs/2026-07-26-ufo-lights-anim-design.md`
- Create: `docs/superpowers/plans/2026-07-26-ufo-lights-anim.md`
- Modify: `src/game/types.ts` — `Ufo.animFrame`, `animTimer`; `ufoHit.animFrame`
- Modify: `src/game/constants.ts` — `UFO.animInterval: 12/60`
- Modify: `src/game/simulation.ts` — spawn defaults; advance in `updateUfo`; pass frame on hit
- Modify: `src/game/visualSig.ts` — include `state.ufo?.animFrame ?? ''`
- Modify: `src/scene/voxels/recipes.ts` — 3 frames + `ufoRecipe(frame: 0|1|2)`
- Modify: `src/scene/Playfield.tsx` — pass frame into `SmoothUfo`
- Modify: `src/scene/voxels/DebrisField.tsx` — `ufoRecipe(e.animFrame)`
- Modify: `src/game/formation.test.ts` — direction + cadence
- Modify: `docs/ARCHITECTURE.md` — one-line note on `ufoRecipe`

## Tasks

### Task 1: Spec + recipes

- [x] Write the design spec from the locked decisions above
- [x] Replace single `UFO_RECIPE` body with three parses; export `ufoRecipe(frame)` and `UFO_RECIPE = ufoRecipe(0)`
- [x] Spot-check ASCII widths stay 16 cols

### Task 2: Sim animation + tests (TDD)

- [x] Failing tests: after spawn, frames advance every 12 ticks; rightward `+1`, leftward `-1` mod 3; `ufoHit` carries `animFrame`
- [x] Extend `Ufo` + `UFO.animIntervalTicks`; init on `spawnUfo`; accumulate/advance in `updateUfo`
- [x] On hit, `pushEvent({ type: 'ufoHit', ..., animFrame })`
- [x] Tests pass

### Task 3: Render + debris + sig

- [x] `visualSig` includes UFO anim frame when present
- [x] `SmoothUfo` takes `animFrame` and uses `<RecipeMesh recipe={ufoRecipe(animFrame)} />`
- [x] Playfield: `animFrame={state.ufo?.animFrame ?? 0}` (mesh stays mounted; recipe updates on sig)
- [x] Debris: `ufoRecipe(e.animFrame)`
- [x] ARCHITECTURE one-liner; run existing unit tests

## Out of scope

- Changing UFO speed, score table, spawn rules, or hitbox
- Motion-snapshot-based frame swapping (React/`visualSig` is enough at 5 Hz)
