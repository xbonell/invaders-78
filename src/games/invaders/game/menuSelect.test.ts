import { describe, expect, it } from 'vitest';
import { ATTRACT, TICK_DT } from './constants';
import { createGame, dispatch, step } from './simulation';
import { visualSig } from './visualSig';

describe('start mode selector', () => {
  it('boots with menuPlayerCount 1', () => {
    const game = createGame(0);
    expect(game.state.menuPlayerCount).toBe(1);
  });

  it('resets menuPlayerCount to 1 when returning to attract', () => {
    const game = createGame(0);
    dispatch(game, { type: 'menuSelect', dir: 1 });
    expect(game.state.menuPlayerCount).toBe(2);
    dispatch(game, { type: 'confirmStart' });
    game.state.phase = 'gameOver';
    game.state.gameOverTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('attract');
    expect(game.state.menuPlayerCount).toBe(1);
  });

  it('menuSelect wraps between 1 and 2', () => {
    const game = createGame(0);
    dispatch(game, { type: 'menuSelect', dir: 1 });
    expect(game.state.menuPlayerCount).toBe(2);
    dispatch(game, { type: 'menuSelect', dir: 1 });
    expect(game.state.menuPlayerCount).toBe(1);
    dispatch(game, { type: 'menuSelect', dir: -1 });
    expect(game.state.menuPlayerCount).toBe(2);
    dispatch(game, { type: 'menuSelect', dir: -1 });
    expect(game.state.menuPlayerCount).toBe(1);
  });

  it('ignores menuSelect when playing', () => {
    const game = createGame(0);
    dispatch(game, { type: 'start' });
    expect(game.state.phase).toBe('playing');
    dispatch(game, { type: 'menuSelect', dir: 1 });
    expect(game.state.menuPlayerCount).toBe(1);
  });

  it('confirmStart begins 1P when menuPlayerCount is 1', () => {
    const game = createGame(0);
    expect(game.state.menuPlayerCount).toBe(1);
    dispatch(game, { type: 'confirmStart' });
    expect(game.state.phase).toBe('playing');
    expect(game.state.playerCount).toBe(1);
  });

  it('confirmStart begins 2P when menuPlayerCount is 2', () => {
    const game = createGame(0);
    dispatch(game, { type: 'menuSelect', dir: 1 });
    dispatch(game, { type: 'confirmStart' });
    expect(game.state.phase).toBe('playing');
    expect(game.state.playerCount).toBe(2);
  });

  it('ignores confirmStart when playing', () => {
    const game = createGame(0);
    dispatch(game, { type: 'start' });
    const lives = game.state.lives;
    dispatch(game, { type: 'confirmStart' });
    expect(game.state.phase).toBe('playing');
    expect(game.state.lives).toBe(lives);
  });

  it('visualSig changes when menuPlayerCount changes', () => {
    const game = createGame(0);
    const before = visualSig(game.state);
    dispatch(game, { type: 'menuSelect', dir: 1 });
    expect(visualSig(game.state)).not.toBe(before);
  });

  it('menuSelect resets attract timer so the carousel does not advance', () => {
    const game = createGame(0);
    game.state.attractTimer = TICK_DT;
    dispatch(game, { type: 'menuSelect', dir: 1 });
    expect(game.state.attractTimer).toBe(ATTRACT.screenDuration);
    step(game, TICK_DT);
    expect(game.state.attractScreen).toBe('info');
  });

  it('menuSelect returns attract to info from demo', () => {
    const game = createGame(0);
    game.state.attractScreen = 'demo';
    game.state.attractTimer = TICK_DT;
    dispatch(game, { type: 'menuSelect', dir: 1 });
    expect(game.state.attractScreen).toBe('info');
    expect(game.state.attractTimer).toBe(ATTRACT.screenDuration);
  });
});
