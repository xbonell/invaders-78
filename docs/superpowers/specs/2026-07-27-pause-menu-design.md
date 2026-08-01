# Pause Menu — Design Spec

Date: 2026-07-27

## Intent

Replace the pause overlay’s hint-only UI with a small arcade-style menu for sound, fullscreen, and resume. Mute leaves the HUD and lives only in this menu. Keyboard, gamepad, and mouse all work.

## Decisions

| Topic | Choice |
|-------|--------|
| Ownership | React UI (`src/app/`), not the sim |
| Items | Sound On/Off · Fullscreen On/Off · Back to game |
| Default highlight | Back to game (on each pause enter) |
| Esc / gamepad Start | Always resume (Esc may also leave fullscreen — browser default) |
| Enter / gamepad South (A) | Confirm highlighted item |
| ↑↓ / D-pad / stick Y | Move highlight |
| Mouse | Click item to activate |
| Mute persistence | Existing `localStorage` via `loadMute` / `saveMute` |
| Fullscreen | `document.documentElement` Fullscreen API; sync via `fullscreenchange`; no persistence; Esc uses UA default; play canvas re-syncs size and remounts if the WebGL context/buffer dies (dual-GPU / some drivers) |
| HUD mute button | Removed |

## Behavior

While `phase === 'paused'`:

1. Overlay shows **Paused** plus three menu buttons; selected item is highlighted.
2. Confirm on **Sound** toggles mute (label updates; stay paused).
3. Confirm on **Fullscreen** requests or exits fullscreen (stay paused).
4. Confirm on **Back to game** dispatches `resume`.
5. Esc and Start still resume without needing the Back item. Esc may also leave fullscreen (browser default); use the menu toggle to enter/exit fullscreen explicitly.

While not paused, input behavior is unchanged (attract/game over: ←→ select mode, Fire / Enter / Start confirm; Start still pauses from play).

## Architecture

```
keyboard / gamepad → PauseMenuInput { navigate, confirm }
        ↓
App React state (index, muted, fullscreen)
        ↓
Overlay PauseMenu UI  ·  AudioEngine.setMuted  ·  Fullscreen API
        ↓ (Back / Esc / Start)
dispatch({ type: 'resume' })
```

- Pure helpers in `src/app/pauseMenu.ts` (item ids + wrap navigation).
- Input modules call a stable callback ref from `useGameLoop`; App owns side effects.

## Out of scope

Volume slider, key rebind, auto-reenter fullscreen on load.

## Testing

```bash
pnpm test    # includes pauseMenu navigation wrap
pnpm lint && pnpm build
```

Manual: pause → navigate keys/pad → toggle sound (persists) → toggle fullscreen (playfield stays visible; HUD/footer alone = bug) → Back / Esc / Start resume; mouse each item; no HUD mute button.
