import type { Game } from '../../games/invaders/game/simulation';
import { dispatch } from '../../games/invaders/game/simulation';
import type { PauseMenuInput } from '../chrome/pauseMenu';
import { confirmMenuStart, isStartable, selectMenu } from './actions';
import { hasSeenGamepad } from './padPresence';
import { clearKeyboardSteer, setKeyboardSteer, steerDir } from './steer';

const moveKeys = new Set(['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D']);

function isFireKey(e: { code: string; key: string }): boolean {
  return e.code === 'Space' || e.key === 'Control' || e.key === 'Enter' || e.code === 'Enter';
}

/**
 * Space is Y on Steam Deck desktop layout. Latch on hasSeenGamepad — fullscreen
 * often clears getGamepads() while Y→Space keeps working.
 */
function shouldIgnoreSpaceFire(e: { code: string }): boolean {
  return e.code === 'Space' && hasSeenGamepad();
}

/** Minimal key fields used by the handler (lets tests avoid DOM KeyboardEvent). */
export type KeyInput = {
  code: string;
  key: string;
  repeat: boolean;
  preventDefault(): void;
};

export type KeyboardHost = {
  addEventListener(
    type: 'keydown' | 'keyup' | 'blur',
    fn: (e: KeyInput) => void,
    options?: boolean | { capture?: boolean },
  ): void;
  removeEventListener(
    type: 'keydown' | 'keyup' | 'blur',
    fn: (e: KeyInput) => void,
    options?: boolean | { capture?: boolean },
  ): void;
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
  /** After confirmStart, ignore fire until Space/Control/Enter is released. */
  let ignoreFireUntilRelease = false;

  const syncMove = () => {
    const left = down.has('ArrowLeft') || down.has('a') || down.has('A');
    const right = down.has('ArrowRight') || down.has('d') || down.has('D');
    setKeyboardSteer({ left, right });
    const dir = steerDir(left, right);
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
    if (e.repeat && isFireKey(e)) return;

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

    // Space / Ctrl / Enter fire. Enter = Steam Deck desktop A; Space = Y —
    // ignore Space while a gamepad is present so fire does not jump to Y.
    if (isFireKey(e)) {
      e.preventDefault();
      if (shouldIgnoreSpaceFire(e)) return;
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
    if (e.key === 'Escape') {
      // Do not preventDefault — allow the UA to leave fullscreen if active.
      // Steam Deck desktop: B and Menu/Start both emit Escape.
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
    if (isFireKey(e)) {
      ignoreFireUntilRelease = false;
    }
    if (moveKeys.has(e.key)) {
      down.delete(e.key);
      syncMove();
    }
  };

  const onBlur = () => {
    const hadMoveKeys = [...down].some((k) => moveKeys.has(k));
    down.clear();
    ignoreFireUntilRelease = false;
    clearKeyboardSteer();
    // Only clear moveDir when keyboard was steering. Unconditional clear races
    // with pollGamepad during fullscreen focus flicker (Steam Deck / Brave).
    if (hadMoveKeys) syncMove();
  };

  // Capture so Space/arrows win over focused pause <button>s (Steam Y→Space).
  const opts = { capture: true };
  target.addEventListener('keydown', onKeyDown, opts);
  target.addEventListener('keyup', onKeyUp, opts);
  target.addEventListener('blur', onBlur);

  return () => {
    target.removeEventListener('keydown', onKeyDown, opts);
    target.removeEventListener('keyup', onKeyUp, opts);
    target.removeEventListener('blur', onBlur);
    clearKeyboardSteer();
  };
}
