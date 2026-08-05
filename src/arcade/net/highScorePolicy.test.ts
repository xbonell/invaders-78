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
