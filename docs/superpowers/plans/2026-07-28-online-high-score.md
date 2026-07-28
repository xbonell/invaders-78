# Online High Score + Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Invaders 78 on Cloudflare Pages and persist a single global max score so any online player who beats it updates it for everyone.

**Architecture:** Keep `src/game/` pure. Add `src/net/` client helpers (policy + `fetch`) wired from `useGameLoop` beside existing `localStorage` hi-score. Cloudflare Pages Function `GET`/`PUT /api/high-score` stores one integer in Workers KV. Local cache still wins offline; boot merges `max(local, remote)`.

**Tech Stack:** Rsbuild, TypeScript, Vitest, Cloudflare Pages Functions, Workers KV, Wrangler.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-28-online-high-score-design.md`
- No `fetch` / DOM / Cloudflare APIs inside `src/game/`
- Single global integer score only — no names, auth, or attract `highScores` UI
- Valid remote scores: finite integers in `0…999999`
- Fail soft on network errors — never block play
- Same-origin `/api/high-score` in production and local `pnpm pages:dev`; `PUBLIC_HIGH_SCORE_API` only for CORS-enabled API origins
- Keep mute/`localStorage` APIs in `src/game/storage.ts` unchanged in behavior
- Prefer updating `docs/ARCHITECTURE.md` + main design spec when this ships

---

## File structure (create / modify)

| File | Responsibility |
|------|----------------|
| `src/net/highScorePolicy.ts` | Pure merge / clamp / should-submit |
| `src/net/highScorePolicy.test.ts` | Unit tests for policy |
| `src/net/highScoreApi.ts` | `fetchGlobalHighScore` / `submitGlobalHighScore` |
| `src/net/highScoreApi.test.ts` | Mocked `fetch` tests |
| `src/hooks/useGameLoop.ts` | Boot sync + submit on hi persist |
| `functions/api/high-score.ts` | Pages Function GET/PUT |
| `wrangler.toml` | Pages + KV binding `HI_SCORE` |
| `package.json` | Optional `pages:dev` script |
| `README.md` | Deploy + env notes |
| `docs/ARCHITECTURE.md` | `src/net/`, deploy, backlog |
| `docs/superpowers/specs/2026-07-25-space-invaders-design.md` | Hi-score + out-of-scope tweak |
| `docs/superpowers/specs/2026-07-28-online-high-score-design.md` | Already written (reference) |

---

### Task 1: High-score policy helpers (TDD)

**Files:**
- Create: `src/net/highScorePolicy.ts`
- Create: `src/net/highScorePolicy.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `HIGH_SCORE_MAX = 999999`
  - `clampHighScore(score: number): number`
  - `mergeHighScores(local: number, remote: number | null): number`
  - `shouldSubmitHighScore(localHigh: number, knownGlobal: number | null): boolean`
  - `nextStoredHighScore(current: number, submitted: number): number | null` — returns new value to store, or `null` if submit is invalid / not greater

- [ ] **Step 1: Write the failing tests**

Create `src/net/highScorePolicy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  HIGH_SCORE_MAX,
  clampHighScore,
  mergeHighScores,
  nextStoredHighScore,
  shouldSubmitHighScore,
} from './highScorePolicy';

describe('clampHighScore', () => {
  it('floors and clamps to 0..HIGH_SCORE_MAX', () => {
    expect(clampHighScore(12.9)).toBe(12);
    expect(clampHighScore(-1)).toBe(0);
    expect(clampHighScore(HIGH_SCORE_MAX + 1)).toBe(HIGH_SCORE_MAX);
    expect(clampHighScore(Number.NaN)).toBe(0);
  });
});

describe('mergeHighScores', () => {
  it('keeps local when remote is null', () => {
    expect(mergeHighScores(100, null)).toBe(100);
  });

  it('takes the max of local and remote', () => {
    expect(mergeHighScores(100, 250)).toBe(250);
    expect(mergeHighScores(300, 250)).toBe(300);
  });
});

describe('shouldSubmitHighScore', () => {
  it('submits when local beats known global', () => {
    expect(shouldSubmitHighScore(100, 50)).toBe(true);
    expect(shouldSubmitHighScore(50, 50)).toBe(false);
    expect(shouldSubmitHighScore(40, 50)).toBe(false);
  });

  it('submits positive local when global unknown', () => {
    expect(shouldSubmitHighScore(10, null)).toBe(true);
    expect(shouldSubmitHighScore(0, null)).toBe(false);
  });
});

describe('nextStoredHighScore', () => {
  it('returns floored submit when greater than current', () => {
    expect(nextStoredHighScore(100, 150.7)).toBe(150);
  });

  it('returns null when not greater or invalid', () => {
    expect(nextStoredHighScore(100, 100)).toBe(null);
    expect(nextStoredHighScore(100, 99)).toBe(null);
    expect(nextStoredHighScore(100, Number.NaN)).toBe(null);
    expect(nextStoredHighScore(100, HIGH_SCORE_MAX + 1)).toBe(null);
    expect(nextStoredHighScore(100, -1)).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test src/net/highScorePolicy.test.ts
```

Expected: FAIL — cannot resolve `./highScorePolicy` / exports missing.

- [ ] **Step 3: Write minimal implementation**

Create `src/net/highScorePolicy.ts`:

```ts
export const HIGH_SCORE_MAX = 999_999;

export function clampHighScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(HIGH_SCORE_MAX, Math.max(0, Math.floor(score)));
}

export function mergeHighScores(local: number, remote: number | null): number {
  if (remote == null) return clampHighScore(local);
  return Math.max(clampHighScore(local), clampHighScore(remote));
}

export function shouldSubmitHighScore(
  localHigh: number,
  knownGlobal: number | null,
): boolean {
  const local = clampHighScore(localHigh);
  if (knownGlobal == null) return local > 0;
  return local > clampHighScore(knownGlobal);
}

/** Server/client shared rule: value to store, or null if reject / no-op. */
export function nextStoredHighScore(
  current: number,
  submitted: number,
): number | null {
  if (!Number.isFinite(submitted)) return null;
  const n = Math.floor(submitted);
  if (n < 0 || n > HIGH_SCORE_MAX) return null;
  const cur = clampHighScore(current);
  return n > cur ? n : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test src/net/highScorePolicy.test.ts
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/net/highScorePolicy.ts src/net/highScorePolicy.test.ts
git commit -m "feat(net): add high-score merge and submit policy"
```

---

### Task 2: High-score API client (TDD)

**Files:**
- Create: `src/net/highScoreApi.ts`
- Create: `src/net/highScoreApi.test.ts`

**Interfaces:**
- Consumes: `clampHighScore`, `nextStoredHighScore` (client uses clamp only; server uses `nextStoredHighScore`)
- Produces:
  - `getHighScoreApiBase(): string` — `import.meta.env.PUBLIC_HIGH_SCORE_API` trimmed, no trailing slash; default `''`
  - `highScoreUrl(): string` — `` `${base}/api/high-score` `` with base possibly empty → `/api/high-score`
  - `fetchGlobalHighScore(): Promise<number | null>`
  - `submitGlobalHighScore(score: number): Promise<number | null>` — PUT; returns server `score` or `null` on failure

- [ ] **Step 1: Write the failing tests**

Create `src/net/highScoreApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGlobalHighScore, highScoreUrl, submitGlobalHighScore } from './highScoreApi';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('highScoreUrl', () => {
  it('defaults to same-origin path', () => {
    expect(highScoreUrl()).toBe('/api/high-score');
  });
});

describe('fetchGlobalHighScore', () => {
  it('returns score on ok JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ score: 420 }),
      }),
    );
    await expect(fetchGlobalHighScore()).resolves.toBe(420);
  });

  it('returns null on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(fetchGlobalHighScore()).resolves.toBeNull();
  });

  it('returns null on non-ok or bad payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ score: 1 }),
      }),
    );
    await expect(fetchGlobalHighScore()).resolves.toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ score: 'nope' }),
      }),
    );
    await expect(fetchGlobalHighScore()).resolves.toBeNull();
  });
});

describe('submitGlobalHighScore', () => {
  it('PUTs JSON and returns server score', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ score: 500 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(submitGlobalHighScore(500)).resolves.toBe(500);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/high-score',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ score: 500 }),
      }),
    );
  });

  it('returns null when request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(submitGlobalHighScore(10)).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test src/net/highScoreApi.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

Create `src/net/highScoreApi.ts`:

```ts
import { clampHighScore } from './highScorePolicy';

function readPublicApiBase(): string {
  const raw = import.meta.env.PUBLIC_HIGH_SCORE_API;
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\/$/, '');
}

export function getHighScoreApiBase(): string {
  return readPublicApiBase();
}

export function highScoreUrl(): string {
  const base = getHighScoreApiBase();
  return `${base}/api/high-score`;
}

function parseScorePayload(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const score = (data as { score?: unknown }).score;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return clampHighScore(score);
}

export async function fetchGlobalHighScore(): Promise<number | null> {
  try {
    const res = await fetch(highScoreUrl(), { method: 'GET' });
    if (!res.ok) return null;
    return parseScorePayload(await res.json());
  } catch {
    return null;
  }
}

export async function submitGlobalHighScore(score: number): Promise<number | null> {
  try {
    const res = await fetch(highScoreUrl(), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score: clampHighScore(score) }),
    });
    if (!res.ok) return null;
    return parseScorePayload(await res.json());
  } catch {
    return null;
  }
}
```

If TypeScript complains about `import.meta.env.PUBLIC_HIGH_SCORE_API`, add a small ambient declaration. Create `src/env.d.ts` if missing:

```ts
/// <reference types="@rsbuild/core/types" />

interface ImportMetaEnv {
  readonly PUBLIC_HIGH_SCORE_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

(`tsconfig.json` already includes `src`, so `src/env.d.ts` is picked up.)

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test src/net/highScoreApi.test.ts src/net/highScorePolicy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/highScoreApi.ts src/net/highScoreApi.test.ts src/env.d.ts
git commit -m "feat(net): add global high-score fetch/submit client"
```

---

### Task 3: Wire boot sync + submit in `useGameLoop`

**Files:**
- Modify: `src/hooks/useGameLoop.ts`

**Interfaces:**
- Consumes: `loadHighScore` / `saveHighScore`, `fetchGlobalHighScore`, `submitGlobalHighScore`, `mergeHighScores`, `shouldSubmitHighScore`
- Produces: on mount, async merge of remote into `game.state.highScore` + local save; on `maybePersistHi`, also submit when policy says so; track `knownGlobalRef`

- [ ] **Step 1: Add boot sync effect**

Near the top of `useGameLoop` (after `game` is created), keep `createGame(loadHighScore())` as today. Add a ref and effect:

```ts
import {
  fetchGlobalHighScore,
  submitGlobalHighScore,
} from '../net/highScoreApi';
import { mergeHighScores, shouldSubmitHighScore } from '../net/highScorePolicy';

// inside useGameLoop:
const knownGlobalRef = useRef<number | null>(null);

useEffect(() => {
  let cancelled = false;
  void (async () => {
    const remote = await fetchGlobalHighScore();
    if (cancelled) return;
    knownGlobalRef.current = remote;
    const merged = mergeHighScores(game.state.highScore, remote);
    if (merged !== game.state.highScore) {
      game.state.highScore = merged;
      saveHighScore(merged);
      bumpUiRef.current();
    } else if (remote != null && shouldSubmitHighScore(game.state.highScore, remote)) {
      const stored = await submitGlobalHighScore(game.state.highScore);
      if (!cancelled && stored != null) knownGlobalRef.current = stored;
    }
  })();
  return () => {
    cancelled = true;
  };
}, [game]);
```

- [ ] **Step 2: Extend `maybePersistHi` to submit globally**

Replace `maybePersistHi` with a version that also attempts remote submit (fire-and-forget):

```ts
function maybePersistHi(
  game: Game,
  events: GameEvent[],
  knownGlobalRef: { current: number | null },
): void {
  if (
    !events.some(
      (e) =>
        (e.type === 'alienHit' && e.points > 0) ||
        (e.type === 'ufoHit' && e.points > 0) ||
        e.type === 'gameOver',
    )
  ) {
    return;
  }

  saveHighScore(game.state.highScore);

  if (!shouldSubmitHighScore(game.state.highScore, knownGlobalRef.current)) return;

  const score = game.state.highScore;
  void submitGlobalHighScore(score).then((stored) => {
    if (stored != null) knownGlobalRef.current = stored;
  });
}
```

Update the call site to pass `knownGlobalRef`.

- [ ] **Step 3: Run unit tests + build**

Run:

```bash
pnpm test && pnpm lint && pnpm build
```

Expected: all green. (No React hook unit tests required; policy/API cover logic.)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGameLoop.ts
git commit -m "feat(app): sync and submit global high score from game loop"
```

---

### Task 4: Cloudflare Pages Function + Wrangler

**Files:**
- Create: `functions/api/high-score.ts`
- Create: `wrangler.toml`
- Modify: `package.json` (script + optional `wrangler` devDependency)

**Interfaces:**
- Consumes: KV binding `HI_SCORE`, key `global`; policy rules mirrored via `nextStoredHighScore` logic (inline or duplicated constants — keep in sync with `HIGH_SCORE_MAX`)
- Produces: `onRequestGet` / `onRequestPut` handlers for `/api/high-score`

- [ ] **Step 1: Add `wrangler.toml`**

```toml
name = "invaders-78"
compatibility_date = "2026-07-28"
pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "HI_SCORE"
id = "REPLACE_WITH_KV_NAMESPACE_ID"
preview_id = "REPLACE_WITH_KV_PREVIEW_ID"
```

Operator creates the KV namespace once:

```bash
npx wrangler kv namespace create HI_SCORE
npx wrangler kv namespace create HI_SCORE --preview
```

Paste the returned IDs into `wrangler.toml`.

- [ ] **Step 2: Implement the Pages Function**

Create `functions/api/high-score.ts`:

```ts
interface Env {
  HI_SCORE: KVNamespace;
}

const KEY = 'global';
const HIGH_SCORE_MAX = 999_999;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function readScore(env: Env): Promise<number> {
  const raw = await env.HI_SCORE.get(KEY);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? Math.min(HIGH_SCORE_MAX, n) : 0;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const score = await readScore(context.env);
  return json({ score });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'invalid score' }, 400);
  }

  const submitted =
    body && typeof body === 'object'
      ? (body as { score?: unknown }).score
      : undefined;

  if (typeof submitted !== 'number' || !Number.isFinite(submitted)) {
    return json({ error: 'invalid score' }, 400);
  }

  const n = Math.floor(submitted);
  if (n < 0 || n > HIGH_SCORE_MAX) {
    return json({ error: 'invalid score' }, 400);
  }

  const current = await readScore(context.env);
  if (n > current) {
    await context.env.HI_SCORE.put(KEY, String(n));
    return json({ score: n });
  }
  return json({ score: current });
};
```

Note: Cloudflare provides `PagesFunction` / `KVNamespace` types via `wrangler` / `@cloudflare/workers-types`. Add as a **devDependency** if the editor/tsc needs them; the Pages bundler typechecks separately. If root `tsc`/`oxlint` scans `functions/`, either:

- exclude `functions` from oxlint include, or
- add a triple-slash reference and `// @ts-expect-error` only if unavoidable

Prefer excluding `functions/**` from app `tsconfig` (already `include: ["src"]`) so app lint stays clean; Wrangler owns the function.

- [ ] **Step 3: Add scripts and wrangler dep**

In `package.json` scripts:

```json
"pages:dev": "pnpm build && wrangler pages dev dist --kv HI_SCORE",
"pages:deploy": "pnpm build && wrangler pages deploy dist"
```

Install:

```bash
pnpm add -D wrangler @cloudflare/workers-types
```

- [ ] **Step 4: Smoke the function locally**

Run:

```bash
pnpm pages:dev
```

In another shell:

```bash
curl -s http://localhost:8788/api/high-score
# → {"score":0}

curl -s -X PUT http://localhost:8788/api/high-score \
  -H 'content-type: application/json' \
  -d '{"score":1234}'
# → {"score":1234}

curl -s -X PUT http://localhost:8788/api/high-score \
  -H 'content-type: application/json' \
  -d '{"score":100}'
# → {"score":1234}

curl -s -X PUT http://localhost:8788/api/high-score \
  -H 'content-type: application/json' \
  -d '{"score":-1}'
# → 400 {"error":"invalid score"}
```

Expected: as commented. (Port may differ — use Wrangler’s printed URL.)

- [ ] **Step 5: Commit**

```bash
git add functions/api/high-score.ts wrangler.toml package.json pnpm-lock.yaml
git commit -m "feat(deploy): add Cloudflare Pages high-score API and wrangler config"
```

Do **not** commit real secrets. KV IDs in `wrangler.toml` are project identifiers (ok to commit once created). If the implementer has not created KV yet, leave placeholders and document in README — deploy step fills them.

---

### Task 5: Docs — README, ARCHITECTURE, design sync

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/superpowers/specs/2026-07-25-space-invaders-design.md`
- Modify: `docs/superpowers/specs/2026-07-27-attract-demo-cycle-design.md` (cross-link only; keep `highScores` UI out of scope)

**Interfaces:**
- Consumes: behavior from Tasks 1–4
- Produces: accurate operator + agent docs

- [ ] **Step 1: README deploy section**

Append to `README.md`:

```markdown
## Deploy (Cloudflare Pages)

1. Create a Cloudflare Pages project linked to this repo (build: `pnpm build`, output: `dist`).
2. Create KV namespace `HI_SCORE` and bind it to the Pages project as `HI_SCORE` (see `wrangler.toml`).
3. Deploy: `pnpm pages:deploy` (or GitHub integration on push to `main`).
4. Local API test: run `pnpm pages:dev` and open the Wrangler URL it serves. This builds `dist` and serves the app plus `/api/high-score` from one origin.
5. `PUBLIC_HIGH_SCORE_API` is only for an API origin that already sends browser CORS headers. This Pages Function does not add CORS, so `pnpm dev` plus a separate `wrangler pages dev` origin will be blocked by browsers.

Global Hi-Score uses `GET`/`PUT /api/high-score`. Offline play still uses `localStorage`.
```

- [ ] **Step 2: ARCHITECTURE updates**

In the directory map table, add:

```markdown
| `src/net/` | Global high-score HTTP client + pure policy (no Three/Audio) |
| `functions/api/high-score.ts` | Cloudflare Pages Function — persisted max score (KV) |
```

In backlog, mark or add:

```markdown
- ~~Online global hi-score~~ — Cloudflare Pages + KV (2026-07-28)
```

In Explicit non-goals, change “online leaderboards” to clarify **named / top-N leaderboards** remain out of scope (single global max is in).

Add a short **How to… Persist / deploy hi-score** bullet pointing at the design spec and `wrangler.toml`.

- [ ] **Step 3: Main design spec**

In `docs/superpowers/specs/2026-07-25-space-invaders-design.md`:

- Change `Hi-score: localStorage` → `Hi-score: localStorage cache + optional global max via /api/high-score ([online high score](./2026-07-28-online-high-score-design.md))`
- In Out of scope: replace “online leaderboards” with “named / top-N online leaderboards (single global max shipped)”

In attract demo cycle design Out of scope, add: “See [online high score](./2026-07-28-online-high-score-design.md) for global max persistence; attract `highScores` UI still deferred.”

- [ ] **Step 4: Format / lint docs-adjacent if needed; commit**

```bash
pnpm format:check
git add README.md docs/ARCHITECTURE.md docs/superpowers/specs/2026-07-25-space-invaders-design.md docs/superpowers/specs/2026-07-27-attract-demo-cycle-design.md
git commit -m "docs: document global high score and Cloudflare Pages deploy"
```

---

### Task 6: End-to-end verification

**Files:** none new

- [ ] **Step 1: Automated suite**

Run:

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm build
```

Expected: all exit 0.

- [ ] **Step 2: Manual checklist**

1. `pnpm dev` with no API — play, raise score, refresh: local hi-score persists.
2. `pnpm pages:dev` — PUT a score via curl; open the game at the Wrangler origin: HUD shows remote max on load.
3. Beat the max in-game — refresh another browser/profile: new max appears after boot sync.
4. PUT a lower score — server keeps the higher value.

- [ ] **Step 3: Final commit only if fixes were needed**

```bash
git add -A
git commit -m "fix: address online high-score verification findings"
```

(Skip empty commit if nothing changed.)

---

## Spec coverage

| Spec requirement | Task |
|------------------|------|
| Single global max score | Task 4 Function + Task 1 policy |
| Persist when player beats max | Task 3 submit + Task 4 PUT |
| localStorage cache / offline | Task 3 + existing `storage.ts` |
| Boot merge max(local, remote) | Task 3 boot effect |
| Same-origin Pages API + KV | Task 4 |
| No fetch in `src/game/` | Tasks 1–3 (`src/net/` + hook) |
| Soft fail on network | Task 2 client |
| Score clamp 0…999999 | Task 1 + Task 4 |
| No attract `highScores` UI / auth / names | Global constraints (no task) |
| Deploy docs | Task 5 |
| Verification | Task 6 |

## Placeholder / consistency self-review

- No TBD/TODO left in steps; KV IDs use explicit `REPLACE_WITH_*` operator action in Task 4.
- `highScoreUrl`, `fetchGlobalHighScore`, `submitGlobalHighScore`, `mergeHighScores`, `shouldSubmitHighScore`, `nextStoredHighScore` names match across tasks.
- Function rejects `HIGH_SCORE_MAX + 1` the same way as `nextStoredHighScore` (invalid → no store).
