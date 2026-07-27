import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';

const STARTABLE = new Set(['attract', 'ready', 'gameOver']);

export function isStartable(game: Game): boolean {
  return STARTABLE.has(game.state.phase);
}

/** Confirm current menuPlayerCount from attract / ready / game over. */
export function confirmMenuStart(game: Game): boolean {
  if (!isStartable(game)) return false;
  dispatch(game, { type: 'confirmStart' });
  return game.state.phase === 'playing';
}

/** Move 1P/2P highlight on the start selector. */
export function selectMenu(game: Game, dir: -1 | 1): void {
  if (isStartable(game)) {
    dispatch(game, { type: 'menuSelect', dir });
  }
}
