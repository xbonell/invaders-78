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
