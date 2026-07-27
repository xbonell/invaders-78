# Attract Demo Cycle Implementation Plan

> **For agentic workers:** Implement tasks below in order. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extensible attract carousel (`info` ↔ `demo`; `highScores` later) with paused sim on non-demo, recipe-accurate score sprites, and overlay crossfade.

**Architecture:** Sim owns `attractScreen` + timer cycle over `ATTRACT.enabledScreens`; autoplay only when `demo`. HUD shows combined info overlay or nothing on demo; CSS fade on screen change. Score table uses 2D grids from voxel recipes.

**Tech Stack:** TypeScript, React, Vitest, existing `recipes.ts` grids.

---

### Task 1: Types + constants + sim cycle

**Files:** `src/game/types.ts`, `src/game/constants.ts`, `src/game/simulation.ts`

- Replace `attractScreen: 0 | 1` with `'info' | 'demo' | 'highScores'`
- Add `enabledScreens`, `transitionDuration` to `ATTRACT`
- Advance via enabled list; pause sim when not demo; `startWave` on demo enter

### Task 2: Tests

**Files:** `src/game/attract.test.ts`

- Boot `info`; advance to `demo`; freeze on info; advance on demo; never `highScores`

### Task 3: RecipeSprite + HUD + CSS

**Files:** `src/app/RecipeSprite.tsx`, `src/app/Hud.tsx`, `src/app/app.css`

- Combined info overlay; hide on demo; larger table; recipe sprites; crossfade
