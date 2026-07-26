# Global Motion Smoothness Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Smooth player bullet, alien shots, and invasion fly-off via `MotionSnapshot`; keep normal alien march stepped.

**Architecture:** Extend display snapshot written each `GameSimDriver` frame; apply positions in `useFrame`; invasion uses formation-origin offset group.

**Tech Stack:** React, R3F, Vitest, existing `playerRender` helpers.

## Global Constraints

- Sim purity: no Three/DOM in `src/game/`
- Collisions use authoritative state only
- Aliens step during play/attract; smooth only in `invasion`

---

### Task 1: Blend helpers + snapshot fields

**Files:** `src/game/playerRender.ts`, `src/game/playerRender.test.ts`

- [x] Add `blendOptionalVec2`, extend `MotionSnapshot` / `createMotionSnapshot`, add `writeMotionSnapshot`
- [x] Tests: spawn/despawn, 120 Hz bullet steps, invasion origin blend

### Task 2: Advance loop writes full snapshot

**Files:** `src/hooks/useGameLoop.ts`

- [x] Stash prev bullet / shot world pos / formation origin before each tick
- [x] Call `writeMotionSnapshot` after ticks

### Task 3: Scene applies snapshot

**Files:** `src/scene/Playfield.tsx`, `src/scene/meshes/GlowBullet.tsx`, `src/scene/meshes/GlowAlienShot.tsx`

- [x] Smooth player bullet + alien shots via useFrame (no React XZ props)
- [x] Invasion offset group for aliens
- [x] Mount still driven by `state` + `version`

### Task 4: Docs + verify

**Files:** `docs/ARCHITECTURE.md`

- [x] Note smoothed movers
- [x] `pnpm test` && `pnpm build`
