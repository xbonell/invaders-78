import { describe, expect, it } from 'vitest';
import { PLAYER, TICK_DT } from './constants';
import { createGame, dispatch, step } from './simulation';

describe('attract and credits', () => {
  it('boots in attract with a live formation', () => {
    const game = createGame(100);
    expect(game.state.phase).toBe('attract');
    expect(game.state.aliens.some((a) => a.alive)).toBe(true);
    expect(game.state.credits).toBe(0);
  });

  it('adds a credit and starts only when credits remain', () => {
    const game = createGame(0);
    dispatch(game, { type: 'start' });
    expect(game.state.phase).toBe('attract');

    dispatch(game, { type: 'credit' });
    expect(game.state.credits).toBe(1);

    dispatch(game, { type: 'start' });
    expect(game.state.phase).toBe('playing');
    expect(game.state.credits).toBe(0);
    expect(game.state.score).toBe(0);
    expect(game.state.lives).toBe(PLAYER.startLives);
  });

  it('returns to attract after game over delay', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    game.state.livesByPlayer[0] = 0;
    game.state.lives = 0;
    game.state.phase = 'dying';
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('gameOver');
    game.state.gameOverTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('attract');
  });

  it('advances formation while in attract', () => {
    const game = createGame(0);
    const before = game.state.formation.originX;
    game.state.formation.stepTimer = game.state.formation.stepInterval;
    step(game, TICK_DT);
    expect(
      game.state.formation.originX !== before ||
        game.state.formation.dir === -1,
    ).toBe(true);
  });
});
