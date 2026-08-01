import type { PauseMenuInput } from '../app/pauseMenu';
import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';
import { confirmMenuStart, isStartable, selectMenu } from './actions';
import { combineSteer, getKeyboardSteer, steerDir, type DigitalSteer } from './steer';

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

/** Minimal Gamepad fields used by the poller (lets tests avoid DOM Gamepad). */
export type PadLike = {
  connected: boolean;
  mapping: string;
  buttons: Array<{ pressed: boolean; value: number } | undefined>;
  axes: ArrayLike<number>;
};

export type PadSteer = DigitalSteer;

const AXIS_DEADZONE = 0.4;
/** POV hats idle at values > 1 when centered; digital hats stay in [-1, 1]. */
const HAT_AXIS_MAX = 1.0001;

export function isButtonDown(button: { pressed: boolean; value: number } | undefined): boolean {
  if (!button) return false;
  // Prefer pressed; high value threshold avoids noisy analog ghosts at ~0.5.
  return button.pressed || button.value >= 0.9;
}

function axisValue(axes: ArrayLike<number>, index: number): number {
  const v = axes[index];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** True when axis looks like a digital hat (-1/0/1), not an idle POV (>1). */
function isDigitalHatAxis(v: number): boolean {
  return Math.abs(v) <= HAT_AXIS_MAX;
}

/**
 * Read steer from one pad.
 *
 * Standard mapping: D-pad is buttons 12–15; only sticks use axes 0–3.
 * Non-standard: also accept axes 6/7 as a digital hat, but ignore POV idle
 * values outside [-1, 1] so they cannot cancel real D-pad buttons.
 * Opposing left/right (or up/down) on one pad are treated as idle (noise).
 */
export function readPadSteer(pad: PadLike): PadSteer {
  const leftStick = axisValue(pad.axes, 0) < -AXIS_DEADZONE;
  const rightStick = axisValue(pad.axes, 0) > AXIS_DEADZONE;
  const upStick = axisValue(pad.axes, 1) < -AXIS_DEADZONE;
  const downStick = axisValue(pad.axes, 1) > AXIS_DEADZONE;

  let leftHat = false;
  let rightHat = false;
  let upHat = false;
  let downHat = false;

  // On "standard", Chromium already mapped hats → buttons; extra axes can be
  // junk POV values (e.g. 1.25 / 3.28 idle) that would latch a direction.
  if (pad.mapping !== 'standard') {
    const hatX = axisValue(pad.axes, 6);
    const hatY = axisValue(pad.axes, 7);
    if (isDigitalHatAxis(hatX)) {
      leftHat = hatX < -AXIS_DEADZONE;
      rightHat = hatX > AXIS_DEADZONE;
    }
    if (isDigitalHatAxis(hatY)) {
      upHat = hatY < -AXIS_DEADZONE;
      downHat = hatY > AXIS_DEADZONE;
    }
  }

  let left = isButtonDown(pad.buttons[14]) || leftStick || leftHat;
  let right = isButtonDown(pad.buttons[15]) || rightStick || rightHat;
  let up = isButtonDown(pad.buttons[12]) || upStick || upHat;
  let down = isButtonDown(pad.buttons[13]) || downStick || downHat;

  // Conflicting axes/buttons on one device → idle (do not wipe keyboard).
  if (left && right) {
    left = false;
    right = false;
  }
  if (up && down) {
    up = false;
    down = false;
  }

  return { left, right, up, down };
}

function asPadLike(pad: {
  connected: boolean;
  mapping: string;
  buttons: ArrayLike<{ pressed: boolean; value: number } | undefined | null>;
  axes: ArrayLike<number>;
}): PadLike {
  const buttons: Array<{ pressed: boolean; value: number } | undefined> = [];
  for (let i = 0; i < pad.buttons.length; i++) {
    const b = pad.buttons[i];
    buttons.push(b ? { pressed: b.pressed, value: b.value } : undefined);
  }
  return {
    connected: pad.connected,
    mapping: pad.mapping,
    buttons,
    axes: pad.axes,
  };
}

function connectedPadsFromNavigator(): PadLike[] {
  const list = navigator.getGamepads?.() ?? [];
  const out: PadLike[] = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p?.connected) out.push(asPadLike(p));
  }
  return out;
}

/**
 * Merge pads with exclusive directions only.
 * A noisy pad that reports both ways is ignored; two pads pulling opposite
 * ways cancel — keyboard steer is applied separately on top.
 */
export function mergePadSteer(pads: PadLike[]): PadSteer {
  const merged: PadSteer = { left: false, right: false, up: false, down: false };
  for (const pad of pads) {
    const s = readPadSteer(pad);
    if (s.left) merged.left = true;
    if (s.right) merged.right = true;
    if (s.up) merged.up = true;
    if (s.down) merged.down = true;
  }
  if (merged.left && merged.right) {
    merged.left = false;
    merged.right = false;
  }
  if (merged.up && merged.down) {
    merged.up = false;
    merged.down = false;
  }
  return merged;
}

function anyButtonDown(pads: PadLike[], index: number): boolean {
  for (const pad of pads) {
    if (isButtonDown(pad.buttons[index])) return true;
  }
  return false;
}

function applyPlaySteer(game: Game, pad: PadSteer, prev: GamepadPrev): void {
  const combined = combineSteer(pad, getKeyboardSteer());
  const left = combined.left;
  const right = combined.right;
  const dir = steerDir(left, right);

  if (dir !== 0) {
    dispatch(game, { type: 'move', dir });
    prev.steering = true;
  } else if (prev.steering) {
    dispatch(game, { type: 'move', dir: 0 });
    prev.steering = false;
  }
  prev.left = left;
  prev.right = right;
}

/** Poll connected gamepads each call (ORs all pads for Steam Input quirks). */
export function pollGamepad(
  game: Game,
  prev: GamepadPrev,
  onGesture?: () => void | Promise<void>,
  pauseMenu?: PauseMenuInput | null,
): void {
  const pads = connectedPadsFromNavigator();

  // Match keyboard: never await audio unlock before gameplay actions.
  const withAudio = (fn: () => void) => {
    void onGesture?.();
    fn();
  };

  const padSteer = pads.length
    ? mergePadSteer(pads)
    : { left: false, right: false, up: false, down: false };
  const { left, right, up, down } = combineSteer(padSteer, getKeyboardSteer());

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
  } else {
    // Always re-apply combined pad+keyboard steer. A conflicting/ghost pad
    // used to dispatch moveDir=0 every frame and wipe Steam desktop arrows.
    if (pads.length || prev.steering || getKeyboardSteer().left || getKeyboardSteer().right) {
      if (steerDir(left, right) !== 0) void onGesture?.();
      applyPlaySteer(game, padSteer, prev);
    } else {
      prev.left = left;
      prev.right = right;
    }
  }

  if (game.state.phase === 'paused' && pauseMenu) {
    if (up && !prev.up) pauseMenu.navigate(-1);
    if (down && !prev.down) pauseMenu.navigate(1);
  }
  prev.up = up;
  prev.down = down;

  if (!pads.length) {
    return;
  }

  const fireBtn = anyButtonDown(pads, 0);
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

  const startBtn = anyButtonDown(pads, 9);
  if (startBtn && !prev.start) {
    withAudio(() => {
      if (isStartable(game)) {
        confirmMenuStart(game);
        if (fireBtn) prev.ignoreFireUntilRelease = true;
      } else if (game.state.phase === 'playing') {
        dispatch(game, { type: 'pause' });
      } else if (game.state.phase === 'paused') {
        dispatch(game, { type: 'resume' });
      }
    });
  }
  prev.start = startBtn;

  // Select/Back no longer starts 2P; keep edge tracking so a later binding can use it.
  prev.select = anyButtonDown(pads, 8);
}
