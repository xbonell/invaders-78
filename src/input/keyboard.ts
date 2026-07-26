import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';
import { addCredit, insertCoinAndStart, insertCoinsAndStartTwo } from './actions';

const moveKeys = new Set(['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D']);

export function attachKeyboard(
  game: Game,
  target: Window = window,
  onGesture?: () => void | Promise<void>,
): () => void {
  const down = new Set<string>();

  const syncMove = () => {
    const left = down.has('ArrowLeft') || down.has('a') || down.has('A');
    const right = down.has('ArrowRight') || down.has('d') || down.has('D');
    let dir: -1 | 0 | 1 = 0;
    if (left && !right) dir = 1;
    else if (right && !left) dir = -1;
    dispatch(game, { type: 'move', dir });
  };

  const withAudio = (fn: () => void) => {
    const result = onGesture?.();
    if (result && typeof (result as Promise<void>).then === 'function') {
      void (result as Promise<void>).then(fn);
    } else {
      fn();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat && (e.code === 'Space' || e.key === 'Control')) return;

    if (e.code === 'Space' || e.key === 'Control') {
      e.preventDefault();
      withAudio(() => dispatch(game, { type: 'fire' }));
      return;
    }
    if (e.key === '5' || e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      withAudio(() => addCredit(game));
      return;
    }
    if (e.key === '2') {
      e.preventDefault();
      withAudio(() => insertCoinsAndStartTwo(game));
      return;
    }
    if (e.key === '1') {
      e.preventDefault();
      withAudio(() => insertCoinAndStart(game));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      withAudio(() => {
        if (game.state.phase === 'paused') {
          dispatch(game, { type: 'resume' });
        } else {
          insertCoinAndStart(game);
        }
      });
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (game.state.phase === 'playing') dispatch(game, { type: 'pause' });
      else if (game.state.phase === 'paused') dispatch(game, { type: 'resume' });
      return;
    }
    if (moveKeys.has(e.key)) {
      e.preventDefault();
      void onGesture?.();
      down.add(e.key);
      syncMove();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (moveKeys.has(e.key)) {
      down.delete(e.key);
      syncMove();
    }
  };

  const onBlur = () => {
    down.clear();
    dispatch(game, { type: 'move', dir: 0 });
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);

  return () => {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('blur', onBlur);
  };
}
