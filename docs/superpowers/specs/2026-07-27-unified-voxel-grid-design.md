# Unified voxel grid — Design Spec

Date: 2026-07-27

## Intent

Align every on-playfield voxel so ships, UFO, bunkers, player bolt, alien shots, and debris read as drawn on one square pixel reticle (same size cubes, shared pitch).

## Decisions

| Topic | Choice |
|-------|--------|
| Shared size | `VOXEL_SIZE = SCALE_X` (`0.125`) |
| Pitch | X and Z step = `VOXEL_SIZE` |
| Solid cube | Edge = `VOXEL_SIZE × 0.92` (existing gap) |
| Playfield | Keep **28×26**; arcade layout positions unchanged |
| Tall cells | `H` / bunker stacks = multiples of `VOXEL_SIZE` |
| Bullet glow | Grid-locked cores + original additive mid/halo (×1.25 / ×2.2); **no** XY pulse scale |
| Player bolt | 1×N square-voxel stack on Z (N ≈ 7) |
| Alien shots | Recipe bits at true size; glow shells only |
| HUD sprites | Out of scope (CSS px, not world voxels) |

## Architecture

- Export `VOXEL_SIZE` from `src/game/logicalSpace.ts`
- All `VoxelRecipe.cell` values = `VOXEL_SIZE`
- `BUNKER.cellSize` / `cellDepth` / stack derived from `VOXEL_SIZE` (square cells)
- Hitboxes in `constants.ts` recompute from grid × `VOXEL_SIZE`
- `GlowBullet` / `GlowAlienShot` render on the grid; soft halo may exceed one cell

## Out of scope

Playfield aspect change (`SCALE_X === SCALE_Z`), CRT overlay, silhouette redraws, HUD `RecipeSprite` pixel size.

## Verification

- Unit: recipes and bunkers share `VOXEL_SIZE`; bunker cells square
- `pnpm test` / `pnpm build`
- Manual: all playfield voxels read as one size; soft glow only; hits / debris / bunker chew work
