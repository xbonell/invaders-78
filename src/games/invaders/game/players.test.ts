import { describe, expect, it } from 'vitest';
import { PLAYER, TICK_DT } from './constants';
import { aliveCount, createFormation, stepIntervalForCount } from './formation';
import { activeBoard, createGame, dispatch, injectAlienShotAtPlayer, step } from './simulation';

describe('two player', () => {
  it('starts 2P with startTwo', () => {
    const game = createGame(0);
    dispatch(game, { type: 'startTwo' });
    expect(game.state.phase).toBe('playing');
    expect(game.state.playerCount).toBe(2);
    expect(game.state.activePlayer).toBe(0);
    expect(game.state.livesByPlayer[0]).toBe(PLAYER.startLives);
    expect(game.state.livesByPlayer[1]).toBe(PLAYER.startLives);
    expect(game.state.boards[0].wave).toBe(1);
    expect(game.state.boards[1].wave).toBe(1);
  });

  it('switches to player 2 after one death even when player 1 has lives left', () => {
    const game = createGame(0);
    dispatch(game, { type: 'startTwo' });
    game.state.scores[0] = 120;
    const p1AliveBefore = aliveCount(game.state.boards[0].aliens);
    game.state.boards[0].formation.originX += 1.5;
    game.state.boards[0].bunkers[0].cells[0] = 0;

    injectAlienShotAtPlayer(game.state);
    step(game, TICK_DT);
    expect(game.state.phase).toBe('dying');
    game.state.dyingTimer = 0;
    step(game, TICK_DT);

    expect(game.state.phase).toBe('playerSwitch');
    expect(game.state.activePlayer).toBe(1);
    expect(game.state.livesByPlayer[0]).toBe(PLAYER.startLives - 1);
    expect(game.state.scores[0]).toBe(120);

    // P1 board preserved while P2 is active
    expect(aliveCount(game.state.boards[0].aliens)).toBe(p1AliveBefore);
    expect(game.state.boards[0].formation.originX).toBeCloseTo(createFormation(1).originX + 1.5, 5);
    expect(game.state.boards[0].bunkers[0].cells[0]).toBe(0);

    game.state.switchTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('playing');
    expect(game.state.activePlayer).toBe(1);
    expect(activeBoard(game.state)).toBe(game.state.boards[1]);
  });

  it('restores player 1 board after player 2 dies', () => {
    const game = createGame(0);
    dispatch(game, { type: 'startTwo' });
    game.state.boards[0].formation.originX += 2;
    const p1Origin = game.state.boards[0].formation.originX;
    game.state.boards[0].bunkers[0].cells[0] = 0;

    // P1 dies → switch to P2
    injectAlienShotAtPlayer(game.state);
    step(game, TICK_DT);
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    game.state.switchTimer = 0;
    step(game, TICK_DT);
    expect(game.state.activePlayer).toBe(1);

    // P2 dies → switch back to P1
    injectAlienShotAtPlayer(game.state);
    step(game, TICK_DT);
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('playerSwitch');
    expect(game.state.activePlayer).toBe(0);
    expect(game.state.boards[0].formation.originX).toBe(p1Origin);
    expect(game.state.boards[0].bunkers[0].cells[0]).toBe(0);
  });

  it('invasion ends only the active player then switches', () => {
    const game = createGame(0);
    dispatch(game, { type: 'startTwo' });
    const board = activeBoard(game.state);
    board.formation.originZ = PLAYER.z;
    board.formation.stepTimer = board.formation.stepInterval;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('invasion');
    expect(game.state.livesByPlayer[0]).toBe(0);
    expect(game.state.livesByPlayer[1]).toBe(PLAYER.startLives);

    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('playerSwitch');
    expect(game.state.activePlayer).toBe(1);
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
