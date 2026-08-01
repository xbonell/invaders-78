import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';
import { confirmMenuStart, isStartable } from './actions';
import { hasSeenGamepad } from './padPresence';

/**
 * Steam Deck desktop / browser layouts often bind A → left mouse button.
 * After fullscreen, face buttons leave the Gamepad API and A only arrives as
 * a primary click — treat that as South when we have seen a pad this session.
 */
export function handleDeckPointerFire(game: Game, button: number, onGesture?: () => void): boolean {
  if (button !== 0 || !hasSeenGamepad()) return false;

  if (game.state.phase === 'paused') {
    // Pause menu buttons handle their own clicks; ignore shell hits.
    return false;
  }

  if (isStartable(game)) {
    onGesture?.();
    confirmMenuStart(game);
    return true;
  }

  if (game.state.phase === 'playing') {
    onGesture?.();
    dispatch(game, { type: 'fire' });
    return true;
  }

  return false;
}
