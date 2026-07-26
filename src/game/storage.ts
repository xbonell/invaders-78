export const HI_SCORE_KEY = 'space-invaders-hi-score';
export const MUTE_KEY = 'space-invaders-mute';

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HI_SCORE_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HI_SCORE_KEY, String(Math.floor(score)));
  } catch {
    /* ignore */
  }
}

export function loadMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMute(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}
