import { describe, expect, it } from 'vitest';
import { createGame } from '../game/simulation';
import { attachKeyboard, type KeyInput, type KeyboardHost } from './keyboard';

type KeyInit = { code: string; key: string; repeat?: boolean };

function mockWindow() {
  const handlers = new Map<string, Set<(e: KeyInput) => void>>();
  const host: KeyboardHost & { dispatch: (type: 'keydown' | 'keyup' | 'blur', init?: KeyInit) => void } =
    {
      addEventListener(type, fn) {
        let set = handlers.get(type);
        if (!set) {
          set = new Set();
          handlers.set(type, set);
        }
        set.add(fn);
      },
      removeEventListener(type, fn) {
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
});
