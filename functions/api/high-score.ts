/// <reference types="@cloudflare/workers-types" />

interface HighScoreStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface Env {
  HI_SCORE: HighScoreStore;
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
    body && typeof body === 'object' ? (body as { score?: unknown }).score : undefined;

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
