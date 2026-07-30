# Touch Virtual Controls — Design Spec

Date: 2026-07-30

## Intent

Enable play on phones/tablets with a Brawl Stars–style floating left joystick and right-side Fire / Pause, mirroring gamepad D-pad / South / Start semantics. Desktop keyboard + gamepad stay primary; sim stays DOM-free.

## Decisions

| Topic | Choice |
|-------|--------|
| Layout | Dynamic left stick (appear under thumb) + Fire + small Pause → **fixed stick base at layout position** + Fire + Pause |
| Steering | X-only; Y ignored; deadzone ~0.35 of stick radius |
| Visibility | Auto on `(pointer: coarse)` or touch capability; hide while `paused` (except layout edit) |
| Attract / game over | Stick past deadzone edge → `menuSelect`; Fire → `confirmStart` + ignore until release |
| Playing | Stick hold → `move`; Fire edge → `fire`; Pause → `pause` |
| Camera flip | Screen-left → `dir = 1` (same as keyboard/pad) |
| Fullscreen | No auto; pause-menu Fullscreen toggle unchanged |
| Multi-touch | Independent stick + fire pointer ids |
| Layout edit | Pause → **Move controls**; drag stick / Fire (Pause moves with Fire); Done saves; Esc cancels; `localStorage` |
| Ownership | Pure helpers `src/input/touch.ts`; layout `src/app/touchLayout.ts`; UI `src/app/TouchControls.tsx` |

## Behavior

1. On touch-capable / coarse-pointer devices, overlay mounts on `.stage` (below pause overlay; above during layout edit).
2. Stick base sits at saved layout position; drag knob within radius (X-only). Release / cancel clears `moveDir`.
3. Past deadzone on X: while startable, edge-trigger `selectMenu`; otherwise hold `dispatch({ type: 'move', dir })`.
4. Fire matches gamepad South (confirm / fire + latch). Pause matches Start while playing only.
5. Blur, tab hidden, or pointercancel clears stick + move and fire latch.
6. **Move controls** (pause menu): enter edit mode; drag stick and Fire/Pause anywhere on the stage (padded so pads stay fully visible); **Done** persists layout; **Esc** reverts. On resize, off-screen saved positions snap to the nearest on-stage point. Defaults: bottom-left stick, bottom-right Fire.

## Architecture

```
TouchControls (DOM pointer events)
        ↓
touch.ts helpers (axis → dir, menu edge)
        ↓
actions.ts / dispatch(move|fire|pause|confirmStart|menuSelect)
```

Keyboard and gamepad continue to call the same actions independently.

## Out of scope

Drag-to-steer ship X, fixed arcade button pads, PWA packaging, auto-fullscreen on start, shared input-bus refactor, 2D combat stick.

## Testing

```bash
pnpm test    # includes touch.ts helpers
pnpm lint && pnpm build
```

Manual: phone/tablet — 1P/2P select via stick, confirm Fire, steer + multi-touch fire, Pause → menu → Move controls → drag → Done; Esc cancels layout edit.
