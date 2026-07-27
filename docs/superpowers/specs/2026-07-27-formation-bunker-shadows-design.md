# Formation → Bunker Shadows — Design Spec

Date: 2026-07-27

## Intent

Restore the formation’s shadow onto the bunkers as aliens descend, without bringing back the per-voxel shadow hitch that motivated disabling shadow maps.

## Context

Shadows were dropped in the global-motion smoothness pass because hundreds of individual voxel boxes cast into a shadow map and spiked frames. Aliens (and other movers) now render as merged `RecipeMesh` silhouettes — one mesh per alien — so selective shadow maps are cheap again.

## Decisions

| Topic | Choice |
|-------|--------|
| Scope | Formation casts; bunkers receive only |
| Player / UFO | Do not cast |
| Ground plane | Does not receive |
| Bunkers | `receiveShadow` only (no bunker self/cast) |
| Canvas | `shadows="percentage"` |
| Key light | Directional with previous ortho shadow camera + 2048 map + bias |
| Ambient / hemisphere | Unchanged intensities/colors |
| Alien mesh | `RecipeMesh` optional `castShadow` (default `false`); Playfield enables for formation |

## Architecture

```
GameCanvas
  Canvas shadows="percentage"
  directionalLight castShadow + shadow frustum (playfield-sized ortho)

Playfield
  aliens → <RecipeMesh castShadow />
  bunkers → cell meshes receiveShadow
  player / UFO / ground → no shadow flags
```

Shadow frustum matches the pre-perf setup (map 2048², left/right/top/bottom ±16, near 1, far 50, bias −0.0002, light at `[10, 18, 8]`).

## Out of scope

- Player / UFO / debris / bullets casting or receiving
- Ground-plane contact shadows
- Bunker-to-bunker or bunker self-shadow
- Changing voxel recipes or merge path
- Soft PCF / contact-hardening alternatives beyond `percentage`

## Docs

- `ARCHITECTURE.md`: note selective shadow maps (formation → bunkers), not flat lighting only
- Product design lighting line: formation casts onto bunkers (not “ground shadows” as the primary claim)

## Testing

- `npm test` / `npm run build`
- Manual: start a wave, wait until formation reaches bunker Z — bunkers darken under aliens; player/UFO leave no shadow; motion stays smooth
