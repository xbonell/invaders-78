# Formation → Bunker Shadows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formation aliens cast percentage shadow maps onto bunker cells as they descend, without hitching from per-voxel shadow casters.

**Architecture:** Re-enable R3F `shadows="percentage"` and a directional key with an ortho shadow camera. Only formation `RecipeMesh` instances set `castShadow`; bunker cell meshes set `receiveShadow`. Player, UFO, ground, and bunkers do not cast.

**Tech Stack:** React Three Fiber, Three.js shadow maps, existing `RecipeMesh` / `BunkerMesh` / `GameCanvas`.

## Global Constraints

- Formation casts; bunkers receive only (spec `2026-07-27-formation-bunker-shadows-design.md`)
- Player / UFO do not cast; ground plane does not receive; bunkers do not cast
- Keep ambient `0.45` and hemisphere `['#9eb6ff', '#1a1a1a', 0.4]` unchanged
- Shadow frustum: map 2048², L/R/T/B ±16, near 1, far 50, bias −0.0002, light position `[10, 18, 8]`
- No Three.js / DOM / Audio inside `src/game/`
- Prefer `pnpm test` / `pnpm build` / `pnpm start` (package manager is pnpm)

---

## File map

| File | Role |
|------|------|
| `src/scene/voxels/RecipeMesh.tsx` | Optional `castShadow` (default `false`) on the merged mesh |
| `src/scene/GameCanvas.tsx` | `shadows="percentage"` + directional `castShadow` + frustum props |
| `src/scene/Playfield.tsx` | Pass `castShadow` only on formation aliens |
| `src/scene/meshes/BunkerMesh.tsx` | `receiveShadow` on both stack boxes per cell |
| `docs/ARCHITECTURE.md` | Replace “flat lighting / no shadow maps” note |
| `docs/superpowers/specs/2026-07-25-space-invaders-design.md` | Lighting line → formation onto bunkers |

No new files. No `src/game/` changes. No automated shadow-map unit tests (visual/GPU); regression = existing unit suite + build + manual check.

---

### Task 1: Scene shadow wiring

**Files:**
- Modify: `src/scene/voxels/RecipeMesh.tsx`
- Modify: `src/scene/GameCanvas.tsx`
- Modify: `src/scene/Playfield.tsx` (formation `RecipeMesh` only)
- Modify: `src/scene/meshes/BunkerMesh.tsx`

**Interfaces:**
- Consumes: existing `RecipeMesh({ recipe })`, Canvas/light layout, bunker cell meshes
- Produces: `RecipeMesh({ recipe, castShadow?: boolean })` with default `false`

- [ ] **Step 1: Add optional `castShadow` to `RecipeMesh`**

Replace `src/scene/voxels/RecipeMesh.tsx` with:

```tsx
import { useMemo } from 'react';
import type { VoxelRecipe } from './recipes';
import { recipeToMergedGeometry } from './mergedGeometry';

/** Single draw-call silhouette from a voxel recipe (movers). */
export function RecipeMesh({
  recipe,
  castShadow = false,
}: {
  recipe: VoxelRecipe;
  castShadow?: boolean;
}) {
  const geometry = useMemo(() => recipeToMergedGeometry(recipe), [recipe]);
  return (
    <mesh geometry={geometry} castShadow={castShadow}>
      <meshLambertMaterial color={recipe.color} />
    </mesh>
  );
}
```

- [ ] **Step 2: Re-enable canvas shadow maps + key light**

In `src/scene/GameCanvas.tsx`, replace the Canvas `shadows` / `onCreated` / `directionalLight` block so it matches:

```tsx
    <Canvas
      orthographic
      shadows="percentage"
      camera={{ position: [0, 30, 0], near: 0.1, far: 100, zoom: 1 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', display: 'block' }}
      onCreated={({ camera, gl }) => {
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
        gl.shadowMap.enabled = true;
      }}
    >
      <color attach="background" args={['#050505']} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#9eb6ff', '#1a1a1a', 0.4]} />
      <directionalLight
        castShadow
        intensity={1.1}
        position={[10, 18, 8]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0002}
      />
```

Keep `GameSimDriver` / `OrthoCameraRig` / `Playfield` children unchanged.

- [ ] **Step 3: Formation casts; bunkers receive**

In `src/scene/Playfield.tsx`, change only the formation alien mesh to:

```tsx
            <RecipeMesh
              recipe={alienRecipe(a.type, state.formation.animFrame)}
              castShadow
            />
```

Leave `SmoothPlayer` / `SmoothUfo` `<RecipeMesh … />` without `castShadow` (default false). Do not add `receiveShadow` to the ground plane mesh.

In `src/scene/meshes/BunkerMesh.tsx`, both cell meshes get `receiveShadow` only:

```tsx
          <mesh position={[0, h * 0.5, 0]} receiveShadow>
            <boxGeometry args={[s, h, d]} />
            <meshLambertMaterial color={BUNKER_COLOR} />
          </mesh>
          <mesh position={[0, h * 1.35, 0]} receiveShadow>
            <boxGeometry args={[s * 0.85, h * 0.7, d * 0.85]} />
            <meshLambertMaterial color={BUNKER_COLOR} />
          </mesh>
```

- [ ] **Step 4: Verify build + unit suite**

Run:

```bash
pnpm test && pnpm build
```

Expected: tests pass; production build succeeds (no TS errors in scene files).

- [ ] **Step 5: Commit**

```bash
git add src/scene/voxels/RecipeMesh.tsx src/scene/GameCanvas.tsx src/scene/Playfield.tsx src/scene/meshes/BunkerMesh.tsx
git commit -m "$(cat <<'EOF'
feat(scene): formation casts shadows on bunkers

EOF
)"
```

---

### Task 2: Docs + manual check

**Files:**
- Modify: `docs/ARCHITECTURE.md` (data-flow item 6)
- Modify: `docs/superpowers/specs/2026-07-25-space-invaders-design.md` (Visuals lighting bullet)

**Interfaces:**
- Consumes: Task 1 scene behavior
- Produces: docs aligned with selective shadow maps

- [ ] **Step 1: Update ARCHITECTURE data-flow note**

Replace item 6 in `docs/ARCHITECTURE.md` (currently flat lighting / no shadow maps) with:

```markdown
6. Selective shadow maps: formation `RecipeMesh` casts; bunker cells receive (`shadows="percentage"`). Player/UFO/ground do not participate — avoids the old per-voxel shadow hitch.
```

- [ ] **Step 2: Update product design lighting line**

In `docs/superpowers/specs/2026-07-25-space-invaders-design.md`, replace:

```markdown
- Lighting: low ambient + hemisphere + angled key + ground shadows
```

with:

```markdown
- Lighting: low ambient + hemisphere + angled key; formation casts onto bunkers
```

- [ ] **Step 3: Manual visual check**

Run: `pnpm start`

Checklist:
- Start 1P; wait until formation reaches bunker Z
- Bunker tops/faces darken under nearby aliens
- Player ship and UFO leave no shadow on bunkers/ground
- Strafing / UFO motion still feels smooth (no obvious hitch from shadow maps)

- [ ] **Step 4: Commit docs**

```bash
git add docs/ARCHITECTURE.md docs/superpowers/specs/2026-07-25-space-invaders-design.md
git commit -m "$(cat <<'EOF'
docs: selective formation→bunker shadows

EOF
)"
```

---

## Out of scope

- Player / UFO / debris / bullets casting or receiving
- Ground-plane contact shadows
- Bunker cast / self-shadow
- Changing recipes, merge geometry, or light intensities beyond the directional shadow props above

## Spec coverage (self-review)

| Spec decision | Task |
|---------------|------|
| Canvas `shadows="percentage"` | Task 1 Step 2 |
| Directional castShadow + frustum | Task 1 Step 2 |
| Formation casts only | Task 1 Steps 1 + 3 |
| Bunkers receive only | Task 1 Step 3 |
| Player/UFO/ground excluded | Task 1 Step 3 |
| ARCHITECTURE + product lighting docs | Task 2 |
| Manual + build verification | Task 1 Step 4, Task 2 Step 3 |
