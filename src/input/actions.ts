import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';

/** 1-player: insert coin if needed, then start. */
export function insertCoinAndStart(game: Game): void {
  const phase = game.state.phase;
  if (phase === 'attract' || phase === 'ready' || phase === 'gameOver') {
    if (game.state.credits < 1) {
      dispatch(game, { type: 'credit' });
    }
    dispatch(game, { type: 'start' });
  }
}

/** 2-player: ensure two credits, then startTwo. */
export function insertCoinsAndStartTwo(game: Game): void {
  const phase = game.state.phase;
  if (phase === 'attract' || phase === 'ready' || phase === 'gameOver') {
    while (game.state.credits < 2) {
      dispatch(game, { type: 'credit' });
    }
    dispatch(game, { type: 'startTwo' });
  }
}

export function addCredit(game: Game): void {
  dispatch(game, { type: 'credit' });
}
