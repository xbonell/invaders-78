import { afterEach, describe, expect, it } from 'vitest';
import { createGame, dispatch } from '../game/simulation';
import { pollGamepad, readPadSteer, type GamepadPrev, type PadLike } from './gamepad';

function emptyPrev(): GamepadPrev {
  return {
    fire: false,
    start: false,
    select: false,
    steering: false,
    left: false,
    right: false,
    up: false,
    down: false,
    ignoreFireUntilRelease: false,
  };
}

function button(pressed: boolean, value = pressed ? 1 : 0) {
  return { pressed, value };
}

/** Standard-layout pad; optional extra axes simulate Linux POV / hat exposure. */
function mockPad(partial: {
  buttons?: Array<{ pressed: boolean; value: number } | undefined>;
  axes?: number[];
  mapping?: GamepadMappingType;
  connected?: boolean;
}): PadLike {
  const buttons = partial.buttons ?? Array.from({ length: 17 }, () => button(false));
  return {
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

describe('readPadSteer', () => {
  it('uses D-pad buttons on the standard mapping', () => {
    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[14] = button(true);
    const steer = readPadSteer(mockPad({ buttons }));
    expect(steer.left).toBe(true);
    expect(steer.right).toBe(false);
  });

  it('does not treat idle POV hat values (>1) as right/left', () => {
    // Chromium notes POV hats idle at a large value (>1) when centered.
    // Reading axes[6] with a 0.4 deadzone would latch "right" forever and
    // cancel real D-pad left (Steam Deck / Brave fullscreen remaps often
    // expose these extra axes alongside standard buttons).
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

  it('treats button.value > 0.5 as pressed when pressed flag is false', () => {
    const buttons = Array.from({ length: 17 }, () => button(false));
    buttons[15] = { pressed: false, value: 1 };
    const steer = readPadSteer(mockPad({ buttons }));
    expect(steer.right).toBe(true);
  });
});

describe('pollGamepad', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'getGamepads');
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
      buttons: Array.from({ length: 17 }, (_, i) => button(i === 0)),
      axes: [0, 0, 0, 0],
    });
    const dpadOnlyButtons = Array.from({ length: 17 }, () => button(false));
    dpadOnlyButtons[15] = button(true);
    const dpadOnly = mockPad({ buttons: dpadOnlyButtons });

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
    stubPads([null, mockPad({ buttons, connected: false }), mockPad({ buttons })]);
    const prev = emptyPrev();
    pollGamepad(game, prev);
    expect(game.moveDir).toBe(1);
  });
});
