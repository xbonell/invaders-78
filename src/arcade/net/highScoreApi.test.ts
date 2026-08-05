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
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
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
