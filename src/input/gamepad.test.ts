import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { activeBoard, createGame, dispatch } from '../game/simulation';
import {
  createGamepadPrev,
  pollGamepad,
  readPadSteer,
  resetGamepadEdges,
  risingButtonEdge,
  type GamepadPrev,
  type PadLike,
} from './gamepad';
import { isGamepadPresent, setGamepadPresent } from './padPresence';
import { clearKeyboardSteer, setKeyboardSteer } from './steer';

function emptyPrev(): GamepadPrev {
  return createGamepadPrev();
}

function button(pressed: boolean, value = pressed ? 1 : 0) {
  return { pressed, value };
}

/** Standard-layout pad; optional extra axes simulate Linux POV / hat exposure. */
function mockPad(
  partial: {
    buttons?: Array<{ pressed: boolean; value: number } | undefined>;
    axes?: number[];
    mapping?: GamepadMappingType;
    connected?: boolean;
    index?: number;
  } = {},
): PadLike {
  const buttons = partial.buttons ?? Array.from({ length: 17 }, () => button(false));
  return {
    index: partial.index ?? 0,
    connected: partial.connected ?? true,
    mapping: partial.mapping ?? 'standard',
    buttons,
    axes: partial.axes ?? [0, 0, 0, 0],
  };
}

function stubPads(pads: Array<PadLike | null>) {
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => pads,
  });
}

/** Unlock that never resolves — pad actions must not wait on it. */
function hangingUnlock() {
  return new Promise<void>(() => {});
}

describe('readPadSteer', () => {
  it('uses D-pad buttons on the standard mapping', () => {
    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[14] = button(true);
    const steer = readPadSteer(mockPad({ buttons }));
    expect(steer.left).toBe(true);
    expect(steer.right).toBe(false);
  });

  it('does not treat idle POV hat values (>1) as right/left', () => {
    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[14] = button(true);
    const steer = readPadSteer(
      mockPad({
        buttons,
        axes: [0, 0, 0, 0, 0, 0, 1.25, 1.25],
        mapping: 'standard',
      }),
    );
    expect(steer.left).toBe(true);
    expect(steer.right).toBe(false);
  });

  it('still reads digital hat axes in [-1, 1] when mapping is empty', () => {
    const left = readPadSteer(
      mockPad({
        mapping: '',
        axes: [-1, 0, 0, 0, 0, 0, -1, 0],
      }),
    );
    expect(left.left).toBe(true);
    expect(left.right).toBe(false);

    const right = readPadSteer(
      mockPad({
        mapping: '',
        axes: [0, 0, 0, 0, 0, 0, 1, 0],
      }),
    );
    expect(right.right).toBe(true);
    expect(right.left).toBe(false);
  });

  it('treats button.value >= 0.9 as pressed when pressed flag is false', () => {
    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[15] = { pressed: false, value: 1 };
    const steer = readPadSteer(mockPad({ buttons }));
    expect(steer.right).toBe(true);
  });
});

describe('risingButtonEdge', () => {
  it('allows a second pad to fire while another pad has South stuck high', () => {
    const ghost = mockPad({
      index: 0,
      buttons: Array.from({ length: 17 }, (_, i) => button(i === 0)),
    });
    const real = mockPad({
      index: 1,
      buttons: Array.from({ length: 17 }, () => button(false)),
    });

    const held = risingButtonEdge([ghost, real], 0, {});
    expect(held.edge).toBe(true); // first sighting of stuck ghost
    expect(held.down).toBe(true);

    // Ghost still held — no new edge
    const stuck = risingButtonEdge([ghost, real], 0, held.next);
    expect(stuck.edge).toBe(false);

    // Real A pressed — rising edge despite ghost
    const realButtons = Array.from({ length: 17 }, () => button(false));
    realButtons[0] = button(true);
    const realPress = mockPad({ index: 1, buttons: realButtons });
    const edge = risingButtonEdge([ghost, realPress], 0, stuck.next);
    expect(edge.edge).toBe(true);
  });
});

describe('pollGamepad', () => {
  beforeEach(() => {
    clearKeyboardSteer();
    setGamepadPresent(false);
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'getGamepads');
    clearKeyboardSteer();
    setGamepadPresent(false);
  });

  it('moves with D-pad left even when a phantom POV axis idles above 1', () => {
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });
    expect(game.state.phase).toBe('playing');

    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[14] = button(true);
    stubPads([
      mockPad({
        buttons,
        axes: [0, 0, 0, 0, 0, 0, 3.28571, 3.28571],
      }),
    ]);

    const prev = emptyPrev();
    pollGamepad(game, prev);
    expect(game.moveDir).toBe(1);
    expect(prev.steering).toBe(true);
  });

  it('ORs inputs across connected pads (Steam Input split devices)', () => {
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });

    const fireOnly = mockPad({
      index: 0,
      buttons: Array.from({ length: 17 }, (_, i) => button(i === 0)),
      axes: [0, 0, 0, 0],
    });
    const dpadOnlyButtons = Array.from({ length: 17 }, () => button(false));
    dpadOnlyButtons[15] = button(true);
    const dpadOnly = mockPad({ index: 1, buttons: dpadOnlyButtons });

    stubPads([fireOnly, dpadOnly]);
    const prev = emptyPrev();
    pollGamepad(game, prev);

    expect(game.moveDir).toBe(-1);
    expect(game.state.phase).toBe('playing');
    expect(prev.fire).toBe(true);
  });

  it('ignores disconnected slots when picking pads', () => {
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });
    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[14] = button(true);
    stubPads([null, mockPad({ buttons, connected: false }), mockPad({ index: 2, buttons })]);
    const prev = emptyPrev();
    pollGamepad(game, prev);
    expect(game.moveDir).toBe(1);
  });

  it('pauses on Start without waiting for audio unlock', () => {
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });
    expect(game.state.phase).toBe('playing');

    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[9] = button(true);
    stubPads([mockPad({ buttons })]);

    let resolveUnlock!: () => void;
    const unlock = () =>
      new Promise<void>((resolve) => {
        resolveUnlock = resolve;
      });

    pollGamepad(game, emptyPrev(), unlock);
    expect(game.state.phase).toBe('paused');
    resolveUnlock();
  });

  it('fires South without waiting for audio unlock', () => {
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });

    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[0] = button(true);
    stubPads([mockPad({ buttons })]);

    pollGamepad(game, emptyPrev(), hangingUnlock);
    expect(activeBoard(game.state).playerBullet).not.toBeNull();
  });

  it('does not wipe keyboard steer when a pad reports conflicting left+right', () => {
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });
    setKeyboardSteer({ left: true });

    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[14] = button(true);
    buttons[15] = button(true);
    stubPads([mockPad({ buttons })]);

    const prev = emptyPrev();
    pollGamepad(game, prev);
    expect(game.moveDir).toBe(1);
    expect(prev.steering).toBe(true);
  });

  it('fires from a second pad while another pad has South stuck after fullscreen', () => {
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });

    const ghostButtons = Array.from({ length: 17 }, (_, i) => button(i === 0));
    const ghost = mockPad({ index: 0, buttons: ghostButtons });
    const idleReal = mockPad({ index: 1 });
    stubPads([ghost, idleReal]);

    const prev = emptyPrev();
    pollGamepad(game, prev); // ghost rising edge may fire once
    // Clear bullet if ghost fired
    activeBoard(game.state).playerBullet = null;

    // Still stuck — no further fire
    pollGamepad(game, prev);
    expect(activeBoard(game.state).playerBullet).toBeNull();

    // Fullscreen-style edge reset, then real A
    resetGamepadEdges();
    const realButtons = Array.from({ length: 17 }, () => button(false));
    realButtons[0] = button(true);
    stubPads([ghost, mockPad({ index: 1, buttons: realButtons })]);
    pollGamepad(game, prev);
    // After reset, ghost also rising — either pad may fire; ensure fire happened
    expect(activeBoard(game.state).playerBullet).not.toBeNull();

    activeBoard(game.state).playerBullet = null;
    // Ghost stuck again, real released then re-pressed
    stubPads([ghost, idleReal]);
    pollGamepad(game, prev);
    const realAgain = Array.from({ length: 17 }, () => button(false));
    realAgain[0] = button(true);
    stubPads([ghost, mockPad({ index: 1, buttons: realAgain })]);
    pollGamepad(game, prev);
    expect(activeBoard(game.state).playerBullet).not.toBeNull();
  });

  it('marks gamepad present while a pad is connected', () => {
    stubPads([mockPad()]);
    pollGamepad(createGame(0), emptyPrev());
    expect(isGamepadPresent()).toBe(true);
  });
});
