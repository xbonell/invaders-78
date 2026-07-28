# Attract demo cycle — Design Spec

Date: 2026-07-27

## Intent

Attract mode cycles between distinct views with a crossfade: an info screen (logo + score-advance table + start instructions) and an autoplay demo. The carousel is extensible for a future online high-scores view.

## Decisions

| Topic | Choice |
|-------|--------|
| Screens | `AttractScreen = 'info' \| 'demo' \| 'highScores'` |
| Enabled today | `['info', 'demo']` — `highScores` reserved, not in cycle |
| Info view | Logo + enlarged score table + start hints; overlay dims over **continuing** autoplay |
| Demo view | Autoplay visible; attract overlay faded out; HUD/footer remain |
| Transition | ~0.5s CSS opacity crossfade; sim keeps running (no pause / no wave reset on flip) |
| Score icons | 2D pixel grids from voxel recipes (same silhouettes as play) |
| Enter attract | Always starts on `info`; reset wave when entering `demo` |
| Input | Mode select + confirm from any attract view; `menuSelect` snaps to `info` and resets the carousel timer ([start mode selector](./2026-07-27-start-mode-selector-design.md)) |

## Cycle

```
info (dimmed overlay) → demo (clear playfield) → [highScores when enabled] → info …
```

## Out of scope

Online high-score fetch, auth, persistence, or stub UI for `highScores`. See [online high score](./2026-07-28-online-high-score-design.md) for global max persistence; attract `highScores` UI still deferred.

## Verification

- Attract: info → fade → demo with explosions → fade → info
- Score icons match in-game aliens/UFO and read larger than before
- 1 / Enter starts from either view
- `pnpm test` / `pnpm build`
