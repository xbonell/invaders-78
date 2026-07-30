import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';
import type { PauseMenuInput } from '../app/pauseMenu';
import { confirmMenuStart, isStartable, selectMenu } from './actions';

const moveKeys = new Set(['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D']);

/** Minimal key fields used by the handler (lets tests avoid DOM KeyboardEvent). */
export type KeyInput = {
  code: string;
  key: string;
  repeat: boolean;
  preventDefault(): void;
};

export type KeyboardHost = {
  addEventListener(type: 'keydown' | 'keyup' | 'blur', fn: (e: KeyInput) => void): void;
  removeEventListener(type: 'keydown' | 'keyup' | 'blur', fn: (e: KeyInput) => void): void;
};

export function attachKeyboard(
  game: Game,
  target: KeyboardHost = window,
  onGesture?: () => void | Promise<void>,
  /** HUD/overlay sync when input changes state outside the sim tick. */
  onUi?: () => void,
  pauseMenu?: PauseMenuInput | null,
): () => void {
  const down = new Set<string>();
  /** After confirmStart, ignore fire until Space/Control is released. */
  let ignoreFireUntilRelease = false;

  const syncMove = () => {
    const left = down.has('ArrowLeft') || down.has('a') || down.has('A');
    const right = down.has('ArrowRight') || down.has('d') || down.has('D');
    let dir: -1 | 0 | 1 = 0;
    if (left && !right) dir = 1;
    else if (right && !left) dir = -1;
    dispatch(game, { type: 'move', dir });
  };

  // Never await audio unlock before gameplay — a quick Space tap released
  // before unlock resolved and left ignoreFireUntilRelease stuck true.
  const withAudio = (fn: () => void) => {
    void onGesture?.();
    fn();
    onUi?.();
  };

  const onKeyDown = (e: KeyInput) => {
    if (e.repeat && (e.code === 'Space' || e.key === 'Control')) return;

    if (game.state.phase === 'paused' && pauseMenu) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        pauseMenu.navigate(e.key === 'ArrowUp' ? -1 : 1);
        onUi?.();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        withAudio(() => pauseMenu.confirm());
        return;
      }
      if (e.key === 'Escape') {
        if (pauseMenu.escape?.()) {
          onUi?.();
          return;
        }
        // Do not preventDefault — allow the UA to leave fullscreen if active.
        dispatch(game, { type: 'resume' });
        onUi?.();
        return;
      }
    }

    if (isStartable(game) && moveKeys.has(e.key)) {
      e.preventDefault();
      void onGesture?.();
      const dir: -1 | 1 = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ? 1 : -1;
      selectMenu(game, dir);
      onUi?.();
      return;
    }

    if (e.code === 'Space' || e.key === 'Control') {
      e.preventDefault();
      if (ignoreFireUntilRelease) return;
      if (isStartable(game)) {
        withAudio(() => {
          if (confirmMenuStart(game)) ignoreFireUntilRelease = true;
        });
        return;
      }
      withAudio(() => dispatch(game, { type: 'fire' }));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isStartable(game)) {
        withAudio(() => {
          confirmMenuStart(game);
        });
      }
      return;
    }
    if (e.key === 'Escape') {
      // Do not preventDefault — allow the UA to leave fullscreen if active.
      if (game.state.phase === 'playing') dispatch(game, { type: 'pause' });
      else if (game.state.phase === 'paused') dispatch(game, { type: 'resume' });
      onUi?.();
      return;
    }
    if (moveKeys.has(e.key)) {
      e.preventDefault();
      void onGesture?.();
      down.add(e.key);
      syncMove();
    }
  };

  const onKeyUp = (e: KeyInput) => {
    if (e.code === 'Space' || e.key === 'Control') {
      ignoreFireUntilRelease = false;
    }
    if (moveKeys.has(e.key)) {
      down.delete(e.key);
      syncMove();
    }
  };

  const onBlur = () => {
    down.clear();
    ignoreFireUntilRelease = false;
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
