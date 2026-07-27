import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';

const STARTABLE = new Set(['attract', 'ready', 'gameOver']);

/** 1-player start from attract / ready / game over. */
export function startOnePlayer(game: Game): void {
  if (STARTABLE.has(game.state.phase)) {
    dispatch(game, { type: 'start' });
  }
}

/** 2-player start from attract / ready / game over. */
export function startTwoPlayers(game: Game): void {
  if (STARTABLE.has(game.state.phase)) {
    dispatch(game, { type: 'startTwo' });
  }
}
