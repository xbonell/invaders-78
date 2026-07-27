# Vivid entity colors — Design Spec

Date: 2026-07-27

## Intent

Keep classic arcade identity (white aliens, green player/bunkers) readable against `backdrop.png` without neon bloom.

## Decisions

| Topic | Choice |
|-------|--------|
| Primary contrast | Dim CSS backdrop on `.shell` (`--backdrop-dim`) + punched palette |
| Canvas | Transparent over `.shell` backdrop; **no shadow maps** (shadows hitch with this path) |
| Emissive | Removed — no measurable benefit vs hitch risk; vividness from hex + backdrop dim |
| Palette | Aliens/shot voxels `#ffffff`; player/bunkers/HUD accent `#22e35a` |
| Emissive | Matching hue, intensity `0.2` on `RecipeMesh`, bunker cells, `VoxelBody` |
| Scene lights | Unchanged |
| UFO / glow bullets | Unchanged (already vivid) |

## Out of scope

Ambient/hemisphere/directional retune, editing the backdrop PNG itself, neon CRT bloom, debris color overrides.

## Verification

- Manual: backdrop reads darker across shell; aliens/player/bunkers contrast clearly; motion smooth without shadow maps
- HUD accent and green ground strip match `#22e35a`
- `pnpm test` / `pnpm build`
