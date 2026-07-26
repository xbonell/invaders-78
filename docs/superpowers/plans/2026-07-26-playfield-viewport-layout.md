# Playfield viewport layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widen the playfield and redistribute Z so gameplay uses more of the viewport; frame the ortho camera on the playfield with a black letterbox.

**Architecture:** Change world constants in `src/game/constants.ts` (PLAYFIELD, PLAYER, BUNKER, FORMATION, UFO). Ground width and player clamp already derive from PLAYFIELD. Update `OrthoCameraRig` to contain-fit playfield bounds; match canvas/stage background to playfield black. Fix unit tests that hard-code old half-width `11`.

**Tech Stack:** TypeScript, Vitest, R3F OrthographicCamera

## Global Constraints

- Keep logical 224×256 overlay; do not make sim bounds viewport-responsive
- No stretch distortion
- Modest width 28 (±14); depth stays 26

---

## File map

| File | Role |
|------|------|
| `src/game/constants.ts` | PLAYFIELD + Z layout targets |
| `src/game/simulation.test.ts` | Clamp assertions vs PLAYFIELD/GROUND_LINE |
| `src/scene/Playfield.tsx` | OrthoCameraRig contain-fit |
| `src/scene/GameCanvas.tsx` | Canvas clear color |
| `src/app/app.css` | `.stage` background |
| `docs/ARCHITECTURE.md` / design spec | Brief note if camera convention changes |

---

### Task 1: Layout constants + clamp tests

**Files:**
- Modify: `src/game/constants.ts`
- Modify: `src/game/simulation.test.ts`
- Test: `src/game/simulation.test.ts`

**Interfaces:**
- Produces: `PLAYFIELD.width === 28`, `minX/maxX === ±14`, `PLAYER.z === -11`, `BUNKER.z === -9`, `FORMATION.startOriginZ === 9.2`, `UFO.z === 11.2`

- [ ] **Step 1: Update failing expectations**

Replace hard-coded `11` in `playerMaxAbsX` tests with `PLAYFIELD.maxX` (clamp must stay strictly inside playfield half-width).

- [ ] **Step 2: Run tests — confirm old constants fail new expectations (or update constants first if expectation already softer)**

Prefer: assert `PLAYFIELD.width === 28` and Z targets in a small constants/layout test, run red, then edit constants green.

- [ ] **Step 3: Apply constant values from spec table**

- [ ] **Step 4: `pnpm test` green**

---

### Task 2: Camera contain-fit + black letterbox

**Files:**
- Modify: `src/scene/Playfield.tsx` (`OrthoCameraRig`)
- Modify: `src/scene/GameCanvas.tsx`
- Modify: `src/app/app.css`

- [ ] **Step 1: OrthoCameraRig** — compute half extents from `PLAYFIELD` + margin (~1); contain-fit to aspect; set left/right/top/bottom; `updateProjectionMatrix`

- [ ] **Step 2: Background** — Canvas `<color>` and `.stage` → `#050505` (or `#000`)

- [ ] **Step 3: Manual check / `pnpm build`**

---

### Task 3: Docs touch-up

**Files:**
- Modify: `docs/ARCHITECTURE.md` (camera bullet: fit playfield, not fixed viewH)
- Modify: `docs/superpowers/specs/2026-07-25-space-invaders-design.md` if visuals section mentions framing

- [ ] **Step 1: Sync one-liner in ARCHITECTURE + main design spec**
