# Player Shot Cadence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match arcade player bolt speed (4 px/frame) and add a 16-frame re-fire lockout after each spent shot.

**Architecture:** Derive `PLAYER.bulletSpeed` from `SCALE_Z`; store `playerFireLockTimer` on `BoardState`; start it in `clearPlayerBullet`; gate `tryPlayerFire`; countdown in play + attract ticks.

**Tech Stack:** TypeScript, Vitest, existing `src/game/` sim.

## Global Constraints

- No Three.js / DOM / Audio in `src/game/`
- Keep `shotCount` advance on clear (unchanged)
- No explode sprite / full ROM shot status machine
- Spec: `docs/superpowers/specs/2026-07-29-player-shot-cadence-design.md`

---

### Task 1: ROM bullet speed + lockout tests & wiring

**Files:**
- Modify: `src/game/constants.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/board.ts`
- Modify: `src/game/simulation.ts`
- Modify: `src/game/simulation.test.ts`
- Modify: `docs/superpowers/specs/2026-07-25-space-invaders-design.md`
- Modify: `docs/ARCHITECTURE.md` (optional one-liner under tune difficulty)

**Interfaces:**
- Produces: `PLAYER.shotLockout`, `PLAYER.bulletSpeed === 4 * 60 * SCALE_Z`, `BoardState.playerFireLockTimer`

- [x] **Step 1: Write failing tests** in `simulation.test.ts`
- [x] **Step 2: Run tests — expect fail** (`pnpm test -- src/game/simulation.test.ts`)
- [x] **Step 3: Implement** constants, board field, `clearPlayerBullet` starts lockout, `tryPlayerFire` gates, countdown in `step` playing + `updateAttract`, reset on wave/death/switch
- [x] **Step 4: Run tests — expect pass**
- [x] **Step 5: Update product design line** (“one shot on screen” → ROM speed + ~16-frame lockout)
- [ ] **Step 6: Commit** only if user requests
