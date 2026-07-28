# Task 6: End-to-end verification report

## Summary

Status: DONE_WITH_CONCERNS

Verification found two issues and both were fixed:

- `pnpm format:check` failed on `rsbuild.config.ts`, `src/hooks/useGameLoop.ts`, and `src/net/highScorePolicy.ts`.
- The documented/manual-check command `pnpm dev` was missing from `package.json`.

## Fixes applied

- Ran `pnpm format`, which updated:
  - `rsbuild.config.ts`
  - `src/hooks/useGameLoop.ts`
  - `src/net/highScorePolicy.ts`
- Added `dev` script to `package.json`:
  - `"dev": "rsbuild"`

## Automated verification

### Initial required gate

Command:

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm build
```

Result:

- `pnpm test`: pass — 17 test files, 139 tests.
- `pnpm lint`: pass.
- `pnpm format:check`: fail — format issues in `rsbuild.config.ts`, `src/hooks/useGameLoop.ts`, `src/net/highScorePolicy.ts`.
- `pnpm build`: not reached because the chain stopped at `format:check`.

### Final required gate

Command:

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm build
```

Result: pass, exit 0.

- `pnpm test`: pass — 17 test files, 139 tests.
- `pnpm lint`: pass.
- `pnpm format:check`: pass — all matched files use the correct format.
- `pnpm build`: pass — Rsbuild production build completed.

## Manual checklist / smoke verification

### 1. `pnpm dev` with no API

Initial result:

- `pnpm dev --help` failed with `Command "dev" not found`.

After fix:

- `pnpm dev` starts Rsbuild successfully.
- Local URL reported by Rsbuild: `http://localhost:3000/`.
- Curl smoke:
  - `GET http://localhost:3000/` returned HTTP 200 with `text/html; charset=utf-8`.
  - `GET http://localhost:3000/api/high-score` returned HTTP 200 from the SPA fallback, not a JSON API. The client catches JSON parse/fetch failures and treats this as no remote score.

Not fully exercised:

- Browser gameplay flow (play, raise score, refresh, verify localStorage hi-score persists) was not manually playtested in this headless environment.

### 2. `pnpm pages:dev` API checks

Started `pnpm pages:dev` in tmux and verified Wrangler local Pages server:

- Ready on `http://localhost:8788`.
- Local KV binding `HI_SCORE` present.

Curl smoke results:

```text
GET initial
{"score":0}
PUT 999999
{"score":999999}
GET after high
{"score":999999}
PUT lower 12345
{"score":999999}
GET after lower
{"score":999999}
PUT invalid 1000000
{"error":"invalid score"}
status=400
GET index
index_status=200 content_type=text/html; charset=utf-8
```

Covered:

- Same-origin Pages API served.
- PUT stores a higher score.
- Subsequent GET returns the stored max.
- PUT lower score preserves the higher max.
- Invalid `HIGH_SCORE_MAX + 1` is rejected with HTTP 400.
- App shell served from the same origin.

Not fully exercised:

- Opening the game in a browser against `pages:dev` and verifying HUD boot sync visually.
- Beating the max in-game and checking another browser/profile after refresh.

## Concerns

- Headless automation covered server/client boot smoke and API policy behavior, but browser gameplay/HUD/localStorage checks were documented as skipped.

## Final review fixes

Changes:

- Reworded README, online high-score spec, ARCHITECTURE how-to, and the implementation plan so local high-score API testing uses same-origin `pnpm pages:dev`.
- Clarified that `PUBLIC_HIGH_SCORE_API` only works with API origins that already provide browser CORS headers; this Pages Function does not add CORS.
- Added a source comment noting that `functions/api/high-score.ts` intentionally mirrors `nextStoredHighScore` policy.

Command:

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm build
```

Result: pass, exit 0.

- `pnpm test`: pass — 17 test files, 139 tests.
- `pnpm lint`: pass.
- `pnpm format:check`: pass — all matched files use the correct format.
- `pnpm build`: pass — Rsbuild production build completed.
