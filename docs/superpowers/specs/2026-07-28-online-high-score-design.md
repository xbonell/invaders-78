# Online high score + deploy — Design Spec

Date: 2026-07-28

## Intent

Deploy **Invaders 78** as a static web game and persist a **single global max score** so any online player who beats the current high score updates it for everyone. Local `localStorage` remains the offline / cache layer. No named leaderboard, auth, or attract `highScores` UI in this slice.

## Assumptions (locked for this slice)

- Hosting target: **Cloudflare Pages** (static `dist/` + same-origin Pages Function).
- Persistence: **one integer** — the all-time max score — in **Workers KV**.
- Players are anonymous; no names, accounts, or anti-cheat beyond basic validation.
- Concurrent race (two higher scores submitted at once) may briefly under-store on KV; acceptable for casual arcade. A later higher submit corrects it.
- Local-only play (no API / failed network) keeps today’s `localStorage` behavior unchanged.

## Decisions

| Topic | Choice |
|-------|--------|
| What is stored | One global `score: number` (arcade-style 0…999999) |
| Where | Cloudflare Pages Function `GET`/`PUT /api/high-score` + KV binding `HI_SCORE` key `global` |
| Client cache | Existing `src/game/storage.ts` `localStorage` |
| Boot | `max(local, remote)`; write-through to local if remote wins; submit if local wins |
| Submit trigger | Same moments as today’s `maybePersistHi` (scoring hit / game over), only when `highScore` exceeds last known global |
| Sim purity | No `fetch` / DOM in `src/game/` — net code in `src/net/`, called from `useGameLoop` |
| Attract `highScores` screen | Still **out of scope** (reserved enum only) |
| Auth / names / top-N list | Out of scope |
| Deploy | Cloudflare Pages from GitHub; build `pnpm build`, output `dist` |

## Approaches considered

1. **Cloudflare Pages + Function + KV (chosen)** — Same-origin API, free tier, static SPA + one durable value, no CORS. Fits Rsbuild `dist/` deploy.
2. **GitHub Pages + external store (Upstash Redis)** — Split hosting; CORS and two vendors; more moving parts for one integer.
3. **Vercel + KV** — Fine for SPAs but weaker fit than Pages+Function for this Rsbuild repo; paid KV emphasis.

## Architecture

```
Browser
  loadHighScore() → createGame(hi)
  fetchGlobalHighScore() ──GET /api/high-score──► Pages Function ──► KV HI_SCORE
  merge → update game.state.highScore + saveHighScore(local)
  on beat: saveHighScore(local) + submitGlobalHighScore(hi) ──PUT──► Function (max only)
```

### API

| Method | Path | Body | Response | Behavior |
|--------|------|------|----------|----------|
| `GET` | `/api/high-score` | — | `{ "score": number }` | Read KV `global`; missing → `0` |
| `PUT` | `/api/high-score` | `{ "score": number }` | `{ "score": number }` | If body score is a finite integer in `0…999999` and **greater** than stored, write it; always return the resulting stored max |

Invalid body → `400` `{ "error": "invalid score" }`. No auth header.

### Client modules

| Module | Role |
|--------|------|
| `src/net/highScorePolicy.ts` | Pure merge / should-submit / clamp helpers (Vitest) |
| `src/net/highScoreApi.ts` | `fetch` wrappers; no-op / null when API base unset or request fails |
| `src/hooks/useGameLoop.ts` | Boot sync + submit alongside `maybePersistHi` |
| `functions/api/high-score.ts` | Cloudflare Pages Function |
| `wrangler.toml` | Pages project name, KV binding `HI_SCORE` |

### Config

- Client calls **same-origin** `/api/high-score` in production (empty base URL).
- Optional `PUBLIC_HIGH_SCORE_API` (Rsbuild public env) for pointing local `pnpm dev` at a deployed or `wrangler pages dev` API.
- When the API is unreachable, fail soft: keep local score; do not block play.

## Error handling

- Network / non-OK / JSON parse errors → treat as “no remote”; log nothing noisy (optional `console.warn` once).
- Never throw into the game loop from sync/submit.
- KV write failures → Function returns `500`; client ignores and retries on next beat opportunity.

## Testing

- Vitest: policy helpers (merge, shouldSubmit, clamp).
- Vitest: API client with mocked `fetch` (ok, fail, invalid).
- Manual / deploy: two browsers — raise score in A, refresh B, HUD Hi-Score matches.

## Out of scope

- Named leaderboards, auth, rate limits, signed scores
- Enabling attract carousel `highScores`
- Steam / Tauri packaging
- Durable Objects / D1 (atomic races) — revisit if abuse or lost highs matter

## Verification

- `pnpm test` / `pnpm lint` / `pnpm build` green
- Local: offline hi-score still works via `localStorage`
- Deployed: GET returns current max; beating it via play updates PUT; other clients see new max after refresh/boot sync
- HUD `Hi-Score` shows the merged value
