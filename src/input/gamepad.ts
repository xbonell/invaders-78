import type { PauseMenuInput } from '../app/pauseMenu';
import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';
import { startOnePlayer, startTwoPlayers } from './actions';

export type GamepadPrev = {
  fire: boolean;
  start: boolean;
  select: boolean;
  steering: boolean;
  up: boolean;
  down: boolean;
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

  if (left || right) {
    void onGesture?.();
    let dir: -1 | 0 | 1 = 0;
    if (left && !right) dir = 1;
    else if (right && !left) dir = -1;
    dispatch(game, { type: 'move', dir });
    prev.steering = true;
  } else if (prev.steering) {
    dispatch(game, { type: 'move', dir: 0 });
    prev.steering = false;
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
    } else {
      withAudio(() => dispatch(game, { type: 'fire' }));
    }
  }
  prev.fire = fireBtn;

  const startBtn = pad.buttons[9]?.pressed ?? false;
  if (startBtn && !prev.start) {
    withAudio(() => {
      if (
        game.state.phase === 'attract' ||
        game.state.phase === 'ready' ||
        game.state.phase === 'gameOver'
      ) {
        startOnePlayer(game);
      } else if (game.state.phase === 'playing') {
        dispatch(game, { type: 'pause' });
      } else if (game.state.phase === 'paused') {
        dispatch(game, { type: 'resume' });
      }
    });
  }
  prev.start = startBtn;

  const selectBtn = pad.buttons[8]?.pressed ?? false;
  if (selectBtn && !prev.select) {
    withAudio(() => startTwoPlayers(game));
  }
  prev.select = selectBtn;
}
