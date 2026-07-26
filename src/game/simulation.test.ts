import { describe, expect, it } from 'vitest';
import {
  createGame,
  dispatch,
  drainEvents,
  injectAlienShotAtPlayer,
  step,
} from './simulation';
import {
  FORMATION,
  GROUND_LINE,
  PLAYER,
  TICK_DT,
  playerMaxAbsX,
} from './constants';

function startGame() {
  const game = createGame(0);
  dispatch(game, { type: 'credit' });
  dispatch(game, { type: 'start' });
  return game;
}

describe('simulation core', () => {
  it('boots in attract and enters playing after credit + start', () => {
    const game = createGame(0);
    expect(game.state.phase).toBe('attract');
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    expect(game.state.phase).toBe('playing');
    expect(game.state.lives).toBe(PLAYER.startLives);
    expect(game.state.aliens.filter((a) => a.alive)).toHaveLength(
      FORMATION.cols * FORMATION.rows,
    );
  });

  it('allows only one player shot at a time', () => {
    const game = startGame();
    dispatch(game, { type: 'fire' });
    expect(game.state.playerBullet).not.toBeNull();
    const first = game.state.playerBullet;
    dispatch(game, { type: 'fire' });
    expect(game.state.playerBullet).toBe(first);
  });

  it('awards points when player bullet hits an alien', () => {
    const game = startGame();
    const alien = game.state.aliens.find((a) => a.alive)!;
    const pos = game.getAlienWorldPos(alien);
    game.state.playerBullet = {
      x: pos.x,
      z: pos.z - 0.2,
      vz: 20,
      fromPlayer: true,
    };
    step(game, TICK_DT);
    expect(alien.alive).toBe(false);
    expect(game.state.score).toBeGreaterThan(0);
    expect(game.state.playerBullet).toBeNull();
    const events = drainEvents(game);
    expect(events.some((e) => e.type === 'alienHit')).toBe(true);
  });

  it('loses a life and enters dying when player is hit', () => {
    const game = startGame();
    injectAlienShotAtPlayer(game.state);
    step(game, TICK_DT);
    expect(game.state.phase).toBe('dying');
    expect(game.state.lives).toBe(PLAYER.startLives - 1);
  });

  it('goes game over when last life is lost', () => {
    const game = startGame();
    game.state.livesByPlayer[0] = 1;
    game.state.lives = 1;
    injectAlienShotAtPlayer(game.state);
    step(game, TICK_DT);
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('gameOver');
  });

  it('clears stuck movement after death even if keys released while dying', () => {
    const game = startGame();
    dispatch(game, { type: 'move', dir: 1 });
    expect(game.moveDir).toBe(1);
    injectAlienShotAtPlayer(game.state);
    step(game, TICK_DT);
    expect(game.state.phase).toBe('dying');
    expect(game.moveDir).toBe(0);
    // Releases during dying must still update moveDir
    dispatch(game, { type: 'move', dir: -1 });
    expect(game.moveDir).toBe(-1);
    dispatch(game, { type: 'move', dir: 0 });
    expect(game.moveDir).toBe(0);
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('playing');
    expect(game.moveDir).toBe(0);
  });

  it('playerMaxAbsX matches green-line outer-edge geometry', () => {
    expect(playerMaxAbsX()).toBe(GROUND_LINE.width / 2 - PLAYER.halfWidth);
    // Must be tighter than full playfield clamp
    expect(playerMaxAbsX()).toBeLessThan(11 - PLAYER.halfWidth);
  });

  it('clamps player so the ship silhouette stays on the green line', () => {
    const game = startGame();
    const max = playerMaxAbsX();
    dispatch(game, { type: 'move', dir: 1 });
    for (let i = 0; i < 200; i++) step(game, TICK_DT);
    expect(game.state.player.x).toBeCloseTo(max, 5);
    expect(Math.abs(game.state.player.x) + PLAYER.halfWidth).toBeLessThanOrEqual(
      GROUND_LINE.width / 2 + 1e-6,
    );

    dispatch(game, { type: 'move', dir: -1 });
    for (let i = 0; i < 400; i++) step(game, TICK_DT);
    expect(game.state.player.x).toBeCloseTo(-max, 5);
  });

  it('invasion: player explodes, formation flies away, then game over', () => {
    const game = startGame();
    drainEvents(game);
    // Drop formation onto the player line
    game.state.formation.originZ = PLAYER.z;
    game.state.formation.stepTimer = game.state.formation.stepInterval;
    const originBefore = game.state.formation.originZ;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('invasion');
    expect(game.state.player.alive).toBe(false);
    expect(game.state.lives).toBe(0);
    const events = drainEvents(game);
    expect(events.some((e) => e.type === 'playerHit')).toBe(true);

    step(game, TICK_DT);
    expect(game.state.formation.originZ).toBeLessThan(originBefore);
    expect(game.state.phase).toBe('invasion');

    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('gameOver');
  });
});
