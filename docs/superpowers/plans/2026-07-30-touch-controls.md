# Touch Virtual Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phone/tablet players get a floating left joystick and right-side Fire/Pause that drive the same `dispatch` / `actions` path as the gamepad.

**Architecture:** Pure helpers in `src/input/touch.ts` map pointer deltas → gamepad-equivalent intents. A DOM overlay (`TouchControls`) on `.stage` owns visuals and pointer capture. Visibility is `(pointer: coarse)` or touch capability. Sim stays DOM-free.

**Tech Stack:** React + Pointer Events, existing `dispatch` / `actions.ts` / pause bridge, Vitest for pure helpers, CSS in `app.css` with stage/safe-area scaling.

## Global Constraints

- No Three/DOM/Audio inside `src/game/`
- Reuse `confirmMenuStart` / `selectMenu` / `ignoreFireUntilRelease` pattern from gamepad
- Prefer pointer events over touch events for mouse+touch laptops
- `pnpm test && pnpm lint && pnpm build` green before done

---

### Task 1 — Design spec + plan on disk

- [x] Write `docs/superpowers/specs/2026-07-30-touch-controls-design.md`
- [x] Save this plan under `docs/superpowers/plans/2026-07-30-touch-controls.md`

### Task 2 — Pure stick math (TDD)

- [x] Failing tests for `stickAxisToDir` / menu-edge helper
- [x] Implement `src/input/touch.ts`
- [x] Tests green

### Task 3 — `TouchControls` UI

- [x] Overlay: left dynamic stick zone, right Fire + Pause
- [x] Coarse/touch visibility; hide when paused
- [x] CSS: translucent pads, safe-area, `touch-action: none`

### Task 4 — Wire gameplay intents

- [x] Stick / Fire / Pause → same sequence as `pollGamepad`
- [x] Mount from `App` with game, phase, unlock, UI bump

### Task 5 — Docs + verify

- [x] ARCHITECTURE + main design Input section
- [x] `pnpm test && pnpm lint && pnpm format:check && pnpm build`

## Out of scope

Drag-to-steer ship X, fixed arcade button pads, PWA/standalone packaging, auto-fullscreen on start, shared input-bus refactor, 2D combat stick (Y unused).
