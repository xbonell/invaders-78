import { afterEach, describe, expect, it } from 'vitest';
import { activeBoard, createGame, dispatch } from '../game/simulation';
import { resetGamepadPresenceForTests, setGamepadPresent } from './padPresence';
import { handleDeckPointerFire } from './pointerFire';

describe('handleDeckPointerFire', () => {
  afterEach(() => {
    resetGamepadPresenceForTests();
  });

  it('does nothing when no gamepad has been seen (normal mouse users)', () => {
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });
    expect(handleDeckPointerFire(game, 0)).toBe(false);
    expect(activeBoard(game.state).playerBullet).toBeNull();
  });

  it('fires on primary click while playing after a pad was seen (Steam A → LMB)', () => {
    setGamepadPresent(true);
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });
    expect(handleDeckPointerFire(game, 0)).toBe(true);
    expect(activeBoard(game.state).playerBullet).not.toBeNull();
  });

  it('ignores non-primary buttons', () => {
    setGamepadPresent(true);
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });
    expect(handleDeckPointerFire(game, 2)).toBe(false);
  });

  it('starts from attract on primary click when a pad was seen', () => {
    setGamepadPresent(true);
    const game = createGame(0);
    expect(game.state.phase).toBe('attract');
    expect(handleDeckPointerFire(game, 0)).toBe(true);
    expect(game.state.phase).toBe('playing');
  });

  it('does not fire through the shell while paused', () => {
    setGamepadPresent(true);
    const game = createGame(0);
    dispatch(game, { type: 'confirmStart' });
    dispatch(game, { type: 'pause' });
    expect(handleDeckPointerFire(game, 0)).toBe(false);
  });
});
