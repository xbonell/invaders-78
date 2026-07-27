# Start Mode Selector — Design Spec

Date: 2026-07-27

## Intent

Replace instant 1P/2P hotkeys with an arcade-style mode selector on attract and game over: navigate with left/right, confirm with Fire. Device identity does not assign players — 2P remains alternating turns with shared controls.

## Decisions

| Topic | Choice |
|-------|--------|
| Selection UI | ◀ 1 PLAYER / 2 PLAYERS ▶ on attract info + game over |
| Default | 1 PLAYER |
| Navigate | ←→ / A D / D-pad / stick (wraps 1↔2) |
| Confirm | Space, Enter, South (A), Start |
| Removed | Keyboard `1`/`2` and gamepad Select/Back as start |
| 2P model | Unchanged: alternating turns, shared controls |
| Join lobby | Out of scope |
| Hint copy | Static (no last-device switching in v1) |

## Screens

Attract (info) and game over CTA:

```text
← Select →
>1 Player  2 Players

PRESS FIRE
```

- On `menuSelect` during attract: snap to `info` and reset `attractTimer` so the carousel does not leave the menu mid-interaction
- Emphasize the current `menuPlayerCount` with a `>` cursor
- Attract demo: overlay may hide; select/confirm still work (select returns to info)

## Sim

- `GameState.menuPlayerCount: 1 | 2` — reset to `1` on enter attract / boot
- Commands:
  - `{ type: 'menuSelect', dir: -1 | 1 }` — wrap between 1 and 2; only when phase ∈ `{attract, ready, gameOver}`
  - `{ type: 'confirmStart' }` — `beginPlay` with `menuPlayerCount`; same phase gate
- Keep `{ type: 'start' }` / `{ type: 'startTwo' }` for tests and direct dispatch

## Input

| Phase | Horizontal | Fire / Enter / Start | Select/Back |
|-------|------------|----------------------|-------------|
| attract / ready / gameOver | `menuSelect` (not ship move) | `confirmStart` | no-op |
| playing | ship move | fire / pause (Start) | unused |
| paused | — | pause menu / resume | unused |

**Edge-release:** after a successful confirm, ignore Fire until that key/button is released so the same press does not shoot on frame one of play.

## Out of scope

Device join screen, per-player device binding, disconnect reconnect UI, simultaneous dual-control coop, dynamic keyboard-vs-pad hint swapping.

## Related

- Product overview: [2026-07-25-space-invaders-design.md](./2026-07-25-space-invaders-design.md)
- 2P boards: [2026-07-27-alternating-2p-boards-design.md](./2026-07-27-alternating-2p-boards-design.md)
