import { afterEach, describe, expect, it } from 'vitest';
import { activeBoard, createGame } from '../game/simulation';
import { attachKeyboard, type KeyInput, type KeyboardHost } from './keyboard';
import { resetGamepadPresenceForTests, setGamepadPresent } from './padPresence';

type KeyInit = { code: string; key: string; repeat?: boolean };

function mockWindow() {
  const handlers = new Map<string, Set<(e: KeyInput) => void>>();
  const host: KeyboardHost & {
    dispatch: (type: 'keydown' | 'keyup' | 'blur', init?: KeyInit) => void;
  } = {
    addEventListener(type, fn, _options) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(fn);
    },
    removeEventListener(type, fn, _options) {
      handlers.get(type)?.delete(fn);
    },
    dispatch(type, init = { code: '', key: '' }) {
      const event: KeyInput = {
        code: init.code,
        key: init.key,
        repeat: init.repeat ?? false,
        preventDefault() {},
      };
      for (const fn of handlers.get(type) ?? []) fn(event);
    },
  };
  return host;
}

describe('attachKeyboard menu start', () => {
  afterEach(() => {
    resetGamepadPresenceForTests();
  });

  it('starts on Space without waiting for deferred audio unlock', async () => {
    const game = createGame(0);
    const win = mockWindow();
    let resolveUnlock!: () => void;
    const unlock = () =>
      new Promise<void>((resolve) => {
        resolveUnlock = resolve;
      });

    const detach = attachKeyboard(game, win, unlock);

    win.dispatch('keydown', { code: 'Space', key: ' ' });
    expect(game.state.phase).toBe('playing');

    win.dispatch('keyup', { code: 'Space', key: ' ' });
    resolveUnlock();
    await Promise.resolve();

    game.state.phase = 'gameOver';
    win.dispatch('keydown', { code: 'Space', key: ' ' });
    expect(game.state.phase).toBe('playing');

    detach();
  });

  it('fires on Enter while playing (Steam Deck desktop A → Enter)', () => {
    const game = createGame(0);
    const win = mockWindow();
    const detach = attachKeyboard(game, win);

    win.dispatch('keydown', { code: 'Enter', key: 'Enter' });
    expect(game.state.phase).toBe('playing');
    // Same Enter must not shoot on frame one of play.
    expect(game.moveDir).toBe(0);

    win.dispatch('keyup', { code: 'Enter', key: 'Enter' });
    win.dispatch('keydown', { code: 'Enter', key: 'Enter' });
    expect(activeBoard(game.state).playerBullet).not.toBeNull();

    detach();
  });

  it('ignores Space fire after a gamepad was seen (Steam Deck Y → Space)', () => {
    setGamepadPresent(true);
    setGamepadPresent(false); // pad dropped (common after fullscreen) — latch remains
    const game = createGame(0);
    const win = mockWindow();
    const detach = attachKeyboard(game, win);

    win.dispatch('keydown', { code: 'Enter', key: 'Enter' });
    expect(game.state.phase).toBe('playing');
    win.dispatch('keyup', { code: 'Enter', key: 'Enter' });

    win.dispatch('keydown', { code: 'Space', key: ' ' });
    expect(activeBoard(game.state).playerBullet).toBeNull();

    win.dispatch('keydown', { code: 'Enter', key: 'Enter' });
    expect(activeBoard(game.state).playerBullet).not.toBeNull();

    detach();
  });
});
