import { describe, expect, it } from 'vitest';
import { ATTRACT, PLAYER, TICK_DT } from './constants';
import { createGame, dispatch, step } from './simulation';

describe('attract and credits', () => {
  it('boots in attract with a live formation', () => {
    const game = createGame(100);
    expect(game.state.phase).toBe('attract');
    expect(game.state.attractScreen).toBe('info');
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
    expect(game.state.attractScreen).toBe('info');
  });

  it('advances from info to demo after screenDuration', () => {
    const game = createGame(0);
    expect(game.state.attractScreen).toBe('info');
    game.state.attractTimer = 0;
    step(game, TICK_DT);
    expect(game.state.attractScreen).toBe('demo');
    expect(ATTRACT.enabledScreens).not.toContain('highScores');
  });

  it('advances formation during attract on info and demo', () => {
    for (const screen of ['info', 'demo'] as const) {
      const game = createGame(0);
      game.state.attractScreen = screen;
      const before = game.state.formation.originX;
      game.state.formation.stepTimer = game.state.formation.stepInterval;
      step(game, TICK_DT);
      expect(
        game.state.formation.originX !== before ||
          game.state.formation.dir === -1,
      ).toBe(true);
    }
  });

  it('does not reset the wave when flipping info to demo', () => {
    const game = createGame(0);
    expect(game.state.attractScreen).toBe('info');
    // Kill one alien while dimmed so a wave reset would revive it
    const victim = game.state.aliens.find((a) => a.alive)!;
    victim.alive = false;
    game.state.attractTimer = 0;
    step(game, TICK_DT);
    expect(game.state.attractScreen).toBe('demo');
    expect(victim.alive).toBe(false);
  });

  it('cycles demo back to info and never highScores', () => {
    const game = createGame(0);
    game.state.attractScreen = 'demo';
    game.state.attractTimer = 0;
    step(game, TICK_DT);
    expect(game.state.attractScreen).toBe('info');
    expect(game.state.attractScreen).not.toBe('highScores');
  });

  it('starts from demo when credits remain', () => {
    const game = createGame(0);
    game.state.attractScreen = 'demo';
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    expect(game.state.phase).toBe('playing');
  });
});
