import { describe, expect, it } from 'vitest';
import { PLAYER, TICK_DT } from './constants';
import { createFormation, stepIntervalForCount } from './formation';
import { createGame, dispatch, injectAlienShotAtPlayer, step } from './simulation';

describe('two player', () => {
  it('starts 2P with startTwo', () => {
    const game = createGame(0);
    dispatch(game, { type: 'startTwo' });
    expect(game.state.phase).toBe('playing');
    expect(game.state.playerCount).toBe(2);
    expect(game.state.activePlayer).toBe(0);
    expect(game.state.livesByPlayer[0]).toBe(PLAYER.startLives);
    expect(game.state.livesByPlayer[1]).toBe(PLAYER.startLives);
  });

  it('switches to player 2 after player 1 loses all lives', () => {
    const game = createGame(0);
    dispatch(game, { type: 'startTwo' });
    game.state.livesByPlayer[0] = 1;
    game.state.scores[0] = 120;
    injectAlienShotAtPlayer(game.state);
    step(game, TICK_DT);
    expect(game.state.phase).toBe('dying');
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('playerSwitch');
    expect(game.state.activePlayer).toBe(1);
    game.state.switchTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('playing');
    expect(game.state.activePlayer).toBe(1);
    expect(game.state.scores[0]).toBe(120);
  });

  it('game over only when both players are out', () => {
    const game = createGame(0);
    dispatch(game, { type: 'startTwo' });
    game.state.livesByPlayer = [0, 0];
    game.state.activePlayer = 1;
    game.state.phase = 'dying';
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('gameOver');
  });
});

describe('wave difficulty', () => {
  it('starts later waves lower using ROM Yr table', () => {
    const w1 = createFormation(1);
    const w3 = createFormation(3);
    expect(w3.originZ).toBeLessThan(w1.originZ);
    expect(w3.stepInterval).toBe(w1.stepInterval);
  });

  it('step interval scales with alive count (one alien per frame)', () => {
    const early = stepIntervalForCount(40, 1);
    const late = stepIntervalForCount(40, 5);
    expect(late).toBe(early);
    expect(stepIntervalForCount(55, 1)).toBeCloseTo(55 / 60, 5);
    expect(stepIntervalForCount(1, 1)).toBeCloseTo(1 / 60, 5);
  });
});
