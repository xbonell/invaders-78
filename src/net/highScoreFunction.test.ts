import { describe, expect, it } from 'vitest';
import { onRequestGet, onRequestPut } from '../../functions/api/high-score';
import { HIGH_SCORE_MAX } from './highScorePolicy';

class HighScoreKv {
  private score: string | null;
  readonly reads: string[] = [];
  readonly writes: string[] = [];

  constructor(score: string | null = null) {
    this.score = score;
  }

  async get(key: string): Promise<string | null> {
    this.reads.push(key);
    return this.score;
  }

  async put(key: string, value: string): Promise<void> {
    this.score = value;
    this.writes.push(value);
  }
}

async function parseJson(response: Response): Promise<unknown> {
  return response.json();
}

function getContext(kv: HighScoreKv): Parameters<typeof onRequestGet>[0] {
  return pageContext(kv, new Request('http://localhost/api/high-score'));
}

function putContext(kv: HighScoreKv, body: unknown): Parameters<typeof onRequestPut>[0] {
  return pageContext(
    kv,
    new Request('http://localhost/api/high-score', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

function pageContext(kv: HighScoreKv, request: Request): Parameters<typeof onRequestPut>[0] {
  return {
    request,
    functionPath: '/api/high-score',
    waitUntil: (promise: Promise<unknown>) => {
      void promise;
    },
    passThroughOnException: () => {
      return undefined;
    },
    next: async () => new Response(null, { status: 404 }),
    env: { HI_SCORE: kv, ASSETS: { fetch } },
    params: {},
    data: {},
  };
}

describe('Pages high-score function', () => {
  it('returns the stored global score on GET', async () => {
    const kv = new HighScoreKv('1234');

    const response = await onRequestGet(getContext(kv));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await parseJson(response)).toEqual({ score: 1234 });
    expect(kv.reads).toEqual(['global']);
  });

  it('stores and returns a higher submitted score on PUT', async () => {
    const kv = new HighScoreKv('100');

    const response = await onRequestPut(putContext(kv, { score: 1234.9 }));

    expect(response.status).toBe(200);
    expect(await parseJson(response)).toEqual({ score: 1234 });
    expect(kv.writes).toEqual(['1234']);
    expect(kv.reads).toEqual(['global']);
  });

  it('returns the current score without writing when submitted score is lower', async () => {
    const kv = new HighScoreKv('1234');

    const response = await onRequestPut(putContext(kv, { score: 100 }));

    expect(response.status).toBe(200);
    expect(await parseJson(response)).toEqual({ score: 1234 });
    expect(kv.writes).toEqual([]);
  });

  it('rejects invalid scores without writing', async () => {
    for (const score of [-1, HIGH_SCORE_MAX + 1, Number.NaN, '100']) {
      const kv = new HighScoreKv('100');

      const response = await onRequestPut(putContext(kv, { score }));

      expect(response.status).toBe(400);
      expect(await parseJson(response)).toEqual({ error: 'invalid score' });
      expect(kv.writes).toEqual([]);
    }
  });
});
