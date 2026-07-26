# Alien Projectile System Implementation Plan

> Copied for repo history from the approved agent plan. Spec: `docs/superpowers/specs/2026-07-26-alien-shots-design.md`

**Goal:** Arcade-authentic alien shots (Rolling / Plunger / Squiggly) with fixed slots, score reload, table/targeting fire, late-wave speed, and deterministic tests — integrated via a 224×256 logical overlay.

**Status:** Implemented 2026-07-26.

## Key modules

- `src/game/alienShots.ts` — slot system
- `src/game/logicalSpace.ts` — coordinate bridge
- `src/game/alienShots.test.ts` — unit + scenario tests
- `src/scene/voxels/recipes.ts` — Squiggly / Rolling / Plunger voxel frames
