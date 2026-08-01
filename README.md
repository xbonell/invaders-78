# Invaders 78

1978-style arcade invaders: 2D dynamics, **voxel** ships (React Three Fiber), procedural Web Audio, keyboard + gamepad.

## Stack

Rsbuild · React · TypeScript · Three.js · React Three Fiber · Web Audio API · Gamepad API · Vitest · Oxc (oxlint / oxfmt)

## Develop

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm format:check
pnpm build
```

`pnpm install` installs a **pre-commit** hook (`simple-git-hooks` + `lint-staged`) that runs `oxfmt` on staged files so CI `format:check` stays green.

## Controls

| Action        | Keyboard             | Gamepad                |
| ------------- | -------------------- | ---------------------- |
| Select mode   | ← → / A D            | D-pad / left stick     |
| Confirm start | Space / Enter        | South (A) / Start      |
| Move          | ← → / A D            | D-pad / left stick     |
| Fire          | Space / Ctrl / Enter | South (A / ×)          |
| Pause         | Esc                  | Start / Menu (in play) |
| Pause menu    | ↑↓ · Enter           | D-pad/stick Y · A      |
| Resume        | Esc                  | Start (while paused)   |

## Docs for contributors / agents

| Doc                                                                                                                      | Purpose                                               |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                                                                             | **Start here** — layout, conventions, backlog, how-to |
| [docs/superpowers/specs/2026-07-25-space-invaders-design.md](docs/superpowers/specs/2026-07-25-space-invaders-design.md) | Design decisions & current scope                      |
| [AGENTS.md](AGENTS.md)                                                                                                   | Short agent checklist                                 |

## Status

Shipped: core loop, attract mode, free 1P/2P start, voxel art + FX, laser bullets, procedural audio.  
Next: playtest/balance, settings, or desktop/Steam packaging (see architecture backlog).

## Deploy (Cloudflare Pages)

### One-time Cloudflare setup

1. Log in: `npx wrangler login` (or create an API token with **Account → Cloudflare Pages → Edit** and **Account → Workers KV Storage → Edit**).
2. Create KV namespaces and put the ids in `wrangler.toml` (replace the `REPLACE_WITH_*` placeholders):

   ```bash
   npx wrangler kv namespace create HI_SCORE
   npx wrangler kv namespace create HI_SCORE --preview
   ```

3. Create the Pages project once if it does not exist (`npx wrangler pages project create invaders-78 --production-branch=main`), or let the first CI deploy create it via `preCommands`.
4. In the Pages project settings, confirm the KV binding name is `HI_SCORE`.

### GitHub Actions (recommended)

On every PR / push: test, lint, format check, and build (`.github/workflows/deploy-pages.yml`).  
On push to `main`: deploy `dist` to Cloudflare Pages with Wrangler.

Add repository secrets:

| Secret                  | Value                          |
| ----------------------- | ------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | API token with Pages + KV edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id          |

Deploy is skipped until `wrangler.toml` has real KV ids (the workflow fails fast on placeholders).

### Manual / local

- Production-like local: `pnpm pages:dev` (same origin for app + `/api/high-score`)
- Manual deploy: `pnpm pages:deploy`
- `PUBLIC_HIGH_SCORE_API` is only for an API origin that already sends browser CORS headers. This Pages Function does not add CORS, so `pnpm dev` plus a separate `wrangler pages dev` origin will be blocked by browsers.

Global Hi-Score uses `GET`/`PUT /api/high-score`. Offline play still uses `localStorage`.
