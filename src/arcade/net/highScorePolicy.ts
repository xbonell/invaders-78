export const HIGH_SCORE_MAX = 999_999;

export function clampHighScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(HIGH_SCORE_MAX, Math.max(0, Math.floor(score)));
}

export function mergeHighScores(local: number, remote: number | null): number {
  if (remote == null) return clampHighScore(local);
  return Math.max(clampHighScore(local), clampHighScore(remote));
}

export function shouldSubmitHighScore(localHigh: number, knownGlobal: number | null): boolean {
  const local = clampHighScore(localHigh);
  if (knownGlobal == null) return local > 0;
  return local > clampHighScore(knownGlobal);
}

/** Server/client shared rule: value to store, or null if reject / no-op.
 * functions/api/high-score.ts mirrors this intentionally because Pages Functions do not import from src/.
 */
export function nextStoredHighScore(current: number, submitted: number): number | null {
  if (!Number.isFinite(submitted)) return null;
  const n = Math.floor(submitted);
  if (n < 0 || n > HIGH_SCORE_MAX) return null;
  const cur = clampHighScore(current);
  return n > cur ? n : null;
}
