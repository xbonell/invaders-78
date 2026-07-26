# Player Ship Smooth Motion + Green-Line Bounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clamp the player cannon so its full silhouette stays on the green ground line, and render-interpolate player X so constant-speed movement looks smooth on high-refresh displays.

**Architecture:** Sim stays fixed 60 Hz with authoritative `state.player.x`. Each animation frame updates `prevTickX` inside the tick loop (before each `step`), then the display path draws the living ship at `lerp(prevTickX, player.x, acc/TICK_DT)`. Zero-tick frames keep the last tick’s `prevTickX` and use leftover `alpha` to glide toward current. Bounds use shared `GROUND_LINE.width` for both the mesh and `updatePlayer` clamp (`halfWidth` inset so outer edges sit on the line ends).

**Tech Stack:** TypeScript, Vitest, React Three Fiber, existing `useGameLoop` fixed-timestep accumulator.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-26-player-ship-smooth-bounds-design.md`
- No accel / friction / ease-in-out — `moveDir * PLAYER.speed * dt` unchanged
- Interpolate **player X display only** — aliens, UFO, bunkers, bullets stay discrete-tick
- Collisions and fire spawn use authoritative `state.player.x`, never the render lerp
- Do not put DOM / Three / Audio inside `src/game/`
- Do not commit unless the user explicitly asks

---

## File map

| File | Role |
|------|------|
| `src/game/constants.ts` | Add `GROUND_LINE.width`; export `playerMaxAbsX()` |
| `src/game/simulation.ts` | Clamp with `playerMaxAbsX()` instead of `PLAYFIELD` edges |
| `src/game/simulation.test.ts` | Edge-clamp coverage |
| `src/game/playerRender.ts` | Pure `interpolatePlayerX` helper |
| `src/game/playerRender.test.ts` | 120 Hz alternate-frame smoothness test |
| `src/hooks/useGameLoop.ts` | Persist `prevTickX` in tick loop, expose `renderPlayerX` |
| `src/app/App.tsx` | Pass `renderPlayerX` into canvas |
| `src/scene/GameCanvas.tsx` | Thread prop to `Playfield` |
| `src/scene/Playfield.tsx` | Draw ship at `renderPlayerX`; mesh uses `GROUND_LINE.width` |

---

### Task 1: Green-line width + outer-edge clamp

**Files:**
- Modify: `src/game/constants.ts`
- Modify: `src/game/simulation.ts` (`updatePlayer`)
- Modify: `src/scene/Playfield.tsx` (ground mesh width only)
- Test: `src/game/simulation.test.ts`

**Interfaces:**
- Consumes: existing `PLAYER.halfWidth`, `PLAYFIELD.width`, `updatePlayer`
- Produces:
  - `GROUND_LINE.width: number` (= `PLAYFIELD.width - 1`)
  - `playerMaxAbsX(): number` → `GROUND_LINE.width / 2 - PLAYER.halfWidth`
  - `updatePlayer` clamps with `±playerMaxAbsX()`

- [ ] **Step 1: Write the failing tests**

Add to `src/game/simulation.test.ts`:

```ts
import { GROUND_LINE, PLAYER, TICK_DT, playerMaxAbsX } from './constants';

// inside describe('simulation core', ...) or a new describe('player bounds', ...)

it('playerMaxAbsX matches green-line outer-edge geometry', () => {
  expect(playerMaxAbsX()).toBe(GROUND_LINE.width / 2 - PLAYER.halfWidth);
  // Must be tighter than full playfield clamp
  expect(playerMaxAbsX()).toBeLessThan(11 - PLAYER.halfWidth);
});

it('clamps player so the ship silhouette stays on the green line', () => {
  const game = startGame();
  const max = playerMaxAbsX();
  dispatch(game, { type: 'move', dir: 1 });
  for (let i = 0; i < 200; i++) step(game, TICK_DT);
  expect(game.state.player.x).toBeCloseTo(max, 5);
  expect(Math.abs(game.state.player.x) + PLAYER.halfWidth).toBeLessThanOrEqual(
    GROUND_LINE.width / 2 + 1e-6,
  );

  dispatch(game, { type: 'move', dir: -1 });
  for (let i = 0; i < 400; i++) step(game, TICK_DT);
  expect(game.state.player.x).toBeCloseTo(-max, 5);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/game/simulation.test.ts`
Expected: FAIL — `playerMaxAbsX` is not exported / clamp still uses playfield edges (right-edge value ≈ `11 - 0.7 = 10.3`, not `10.5 - 0.7 = 9.8`).

- [ ] **Step 3: Add constant + helper**

In `src/game/constants.ts`, update `GROUND_LINE` and add helper:

```ts
/** Green baseline under the cannon — 1 voxel cell thick. */
export const GROUND_LINE = {
  /** Shared by mesh and player clamp (was `PLAYFIELD.width - 1` inline in Playfield). */
  width: PLAYFIELD.width - 1,
  thickness: BUNKER.cellSize,
  y: 0.02,
  /** Offset below PLAYER.z */
  zOffset: 0.85,
} as const;

/** Max |player.x| so ship outer edges stay on the green line. */
export function playerMaxAbsX(): number {
  return GROUND_LINE.width / 2 - PLAYER.halfWidth;
}
```

- [ ] **Step 4: Clamp in `updatePlayer`**

In `src/game/simulation.ts`, import `playerMaxAbsX` (drop `PLAYFIELD` from this clamp if unused elsewhere in the file — keep `PLAYFIELD` if other functions need it). Replace the clamp:

```ts
function updatePlayer(game: Game, dt: number): void {
  const { state } = game;
  if (!state.player.alive) return;
  state.player.x += game.moveDir * PLAYER.speed * dt;
  const max = playerMaxAbsX();
  state.player.x = Math.max(-max, Math.min(max, state.player.x));
}
```

- [ ] **Step 5: Point ground mesh at `GROUND_LINE.width`**

In `src/scene/Playfield.tsx`, change the box geometry width arg from `PLAYFIELD.width - 1` to `GROUND_LINE.width`:

```tsx
<mesh position={[0, GROUND_LINE.y, PLAYER.z - GROUND_LINE.zOffset]}>
  <boxGeometry
    args={[GROUND_LINE.width, GROUND_LINE.y, GROUND_LINE.thickness]}
  />
  <meshLambertMaterial color="#3ecf6a" />
</mesh>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/game/simulation.test.ts`
Expected: PASS for the new bounds tests (full suite still green).

- [ ] **Step 7: Commit only if user asked**

```bash
git add src/game/constants.ts src/game/simulation.ts src/game/simulation.test.ts src/scene/Playfield.tsx
git commit -m "$(cat <<'EOF'
fix: clamp player ship to green ground line

EOF
)"
```

---

### Task 2: Render-interpolate player X

**Files:**
- Modify: `src/hooks/useGameLoop.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/scene/GameCanvas.tsx`
- Modify: `src/scene/Playfield.tsx`
- Optional pure helper: `src/game/playerRender.ts` (`interpolatePlayerX`) + unit test for 120 Hz alternate-frame smoothness

**Interfaces:**
- Consumes: `TICK_DT`, fixed-step `acc`, `game.state.player.x`
- Produces: `GameLoopApi.renderPlayerX: number` — display X for the living ship
- Prop chain: `useGameLoop` → `App` → `GameCanvas` → `Playfield`

- [ ] **Step 1: Expose `renderPlayerX` from the game loop**

In `src/hooks/useGameLoop.ts`:

```ts
export interface GameLoopApi {
  game: Game;
  state: GameState;
  version: number;
  /** Display-only interpolated player X (sim remains authoritative). */
  renderPlayerX: number;
}

export function useGameLoop(audio: AudioEngine | null): GameLoopApi {
  // ...existing refs...
  const [version, setVersion] = useState(0);
  const [renderPlayerX, setRenderPlayerX] = useState(() => game.state.player.x);
  const prevTickX = useRef(game.state.player.x);

  useEffect(() => {
    // ...existing setup...
    let acc = 0;
    let last = performance.now();
    // ...

    const frame = (now: number) => {
      if (!running) return;
      const raw = Math.min(0.05, (now - last) / 1000);
      last = now;

      pollGamepad(game, padPrev.current, unlock);

      const visible = document.visibilityState === 'visible';
      if (visible && game.state.phase !== 'paused') {
        acc += raw;
        while (acc >= TICK_DT) {
          prevTickX.current = game.state.player.x;
          step(game, TICK_DT);
          acc -= TICK_DT;
        }
      }

      const alpha = acc / TICK_DT;
      const currentX = game.state.player.x;
      const drawnX = interpolatePlayerX(prevTickX.current, currentX, alpha);
      setRenderPlayerX(drawnX);

      // ...existing drainEvents / setVersion / rAF...
    };

    // ...rest unchanged...
  }, [game]);

  return { game, state: game.state, version, renderPlayerX };
}
```

Notes for the implementer:
- Persist `prevTickX` in a ref; update **inside** the `while` loop before each `step` (not at frame start).
- Zero-tick frames keep the last tick’s `prevTickX` and use leftover `alpha` to glide toward current — not a no-op.
- Do **not** write `drawnX` back into `state.player.x`.

- [ ] **Step 2: Thread the prop to `Playfield`**

`src/app/App.tsx`:

```tsx
const { state, version, renderPlayerX } = useGameLoop(audio);
// ...
<GameCanvas state={state} version={version} renderPlayerX={renderPlayerX} />
```

`src/scene/GameCanvas.tsx`:

```tsx
export function GameCanvas({
  state,
  version,
  renderPlayerX,
}: {
  state: GameState;
  version: number;
  renderPlayerX: number;
}) {
  // ...
  <Playfield state={state} version={version} renderPlayerX={renderPlayerX} />
}
```

`src/scene/Playfield.tsx`:

```tsx
export function Playfield({
  state,
  version,
  renderPlayerX,
}: {
  state: GameState;
  version: number;
  renderPlayerX: number;
}) {
  // ...
  {state.player.alive && (
    <group position={[renderPlayerX, 0, state.player.z]}>
      <VoxelBody recipe={PLAYER_RECIPE} />
    </group>
  )}
}
```

Leave bullet spawn / debris / collisions on `state.player.x` (unchanged).

- [ ] **Step 3: Typecheck / tests**

Run: `npm test`
Expected: PASS

Run: `npx tsc --noEmit` (if configured) or `npm run build`
Expected: build succeeds with no prop-type errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`
- Hold left/right: motion looks continuous (no 60 Hz stutter on a high-refresh display).
- Drive into each end: ship outer edge stops on the green line; no overhang.
- Fire while moving: shots still originate from sim position (may lead/lag display by &lt;1 tick — acceptable per spec).

- [ ] **Step 5: Commit only if user asked**

```bash
git add src/hooks/useGameLoop.ts src/app/App.tsx src/scene/GameCanvas.tsx src/scene/Playfield.tsx
git commit -m "$(cat <<'EOF'
feat: render-interpolate player ship X for smooth motion

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `GROUND_LINE.width` shared by mesh + clamp | Task 1 |
| Outer-edge clamp (`halfLine − halfWidth`) | Task 1 |
| Constant speed / no ease | unchanged; Task 2 only lerps display |
| Render lerp with `prevTickX` updated inside tick loop + `alpha = acc/TICK_DT` | Task 2 |
| Sim X authoritative for hits/fire | Task 2 notes |
| Unit tests for bounds | Task 1 |
| Manual smoothness + no overhang | Task 2 Step 4 |
