import type { PauseMenuInput } from '../app/pauseMenu';
import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';
import { confirmMenuStart, isStartable, selectMenu } from './actions';

export type GamepadPrev = {
  fire: boolean;
  start: boolean;
  select: boolean;
  steering: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** After confirmStart, ignore South fire until button release. */
  ignoreFireUntilRelease: boolean;
};

/** Poll first connected gamepad each call. */
export function pollGamepad(
  game: Game,
  prev: GamepadPrev,
  onGesture?: () => void | Promise<void>,
  pauseMenu?: PauseMenuInput | null,
): void {
  const pads = navigator.getGamepads?.() ?? [];
  const pad = pads.find((p) => p && p.connected);
  if (!pad) {
    return;
  }

  const withAudio = (fn: () => void) => {
    const result = onGesture?.();
    if (result && typeof result.then === 'function') {
      void result.then(fn);
    } else {
      fn();
    }
  };

  const left = pad.buttons[14]?.pressed || (pad.axes[0] ?? 0) < -0.4 || (pad.axes[6] ?? 0) < -0.4;
  const right = pad.buttons[15]?.pressed || (pad.axes[0] ?? 0) > 0.4 || (pad.axes[6] ?? 0) > 0.4;

  if (isStartable(game)) {
    if (left && !prev.left) {
      void onGesture?.();
      selectMenu(game, 1);
    }
    if (right && !prev.right) {
      void onGesture?.();
      selectMenu(game, -1);
    }
    prev.left = left;
    prev.right = right;
    if (prev.steering) {
      dispatch(game, { type: 'move', dir: 0 });
      prev.steering = false;
    }
  } else if (left || right) {
    void onGesture?.();
    let dir: -1 | 0 | 1 = 0;
    if (left && !right) dir = 1;
    else if (right && !left) dir = -1;
    dispatch(game, { type: 'move', dir });
    prev.steering = true;
    prev.left = left;
    prev.right = right;
  } else if (prev.steering) {
    dispatch(game, { type: 'move', dir: 0 });
    prev.steering = false;
    prev.left = false;
    prev.right = false;
  } else {
    prev.left = left;
    prev.right = right;
  }

  const up = pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.4 || (pad.axes[7] ?? 0) < -0.4;
  const down = pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.4 || (pad.axes[7] ?? 0) > 0.4;

  if (game.state.phase === 'paused' && pauseMenu) {
    if (up && !prev.up) pauseMenu.navigate(-1);
    if (down && !prev.down) pauseMenu.navigate(1);
  }
  prev.up = up;
  prev.down = down;

  const fireBtn = pad.buttons[0]?.pressed ?? false;
  if (fireBtn && !prev.fire) {
    if (game.state.phase === 'paused' && pauseMenu) {
      withAudio(() => pauseMenu.confirm());
    } else if (isStartable(game)) {
      withAudio(() => {
        if (confirmMenuStart(game)) prev.ignoreFireUntilRelease = true;
      });
    } else if (!prev.ignoreFireUntilRelease) {
      withAudio(() => dispatch(game, { type: 'fire' }));
    }
  }
  if (!fireBtn) prev.ignoreFireUntilRelease = false;
  prev.fire = fireBtn;

  const startBtn = pad.buttons[9]?.pressed ?? false;
  if (startBtn && !prev.start) {
    withAudio(() => {
      if (isStartable(game)) {
        confirmMenuStart(game);
        if (fireBtn) prev.ignoreFireUntilRelease = true;
      } else if (game.state.phase === 'playing') {
        dispatch(game, { type: 'pause' });
      } else if (game.state.phase === 'paused') {
        if (pauseMenu?.escape?.()) return;
        dispatch(game, { type: 'resume' });
      }
    });
  }
  prev.start = startBtn;

  // Select/Back no longer starts 2P; keep edge tracking so a later binding can use it.
  prev.select = pad.buttons[8]?.pressed ?? false;
}
