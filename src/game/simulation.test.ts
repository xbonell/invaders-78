import { describe, expect, it } from 'vitest';
import {
  BUNKER,
  FORMATION,
  GROUND_LINE,
  PLAYER,
  PLAYFIELD,
  TICK_DT,
  UFO,
  playerMaxAbsX,
} from './constants';
import {
  ALIEN_CELL_PX,
  REF_ALIEN_XR,
  SHIELD_LEFT_XR,
  SHIELD_PITCH_PX,
  formationTopLeftForWave,
  refAlienYrForWave,
  shieldCenterWorld,
} from './arcadeLayout';
import { allAlienShotSlots, clearAlienShots } from './alienShots';
import { SCALE_X, SCALE_Z } from './logicalSpace';
import {
  createGame,
  dispatch,
  drainEvents,
  injectAlienShotAtPlayer,
  step,
} from './simulation';

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
    dispatch(game, { type: 'move', dir: -1 });
    expect(game.moveDir).toBe(-1);
    dispatch(game, { type: 'move', dir: 0 });
    expect(game.moveDir).toBe(0);
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('playing');
    expect(game.moveDir).toBe(0);
  });

  it('uses ROM-derived layout positions', () => {
    expect(PLAYFIELD.width).toBe(28);
    expect(FORMATION.colSpacing).toBeCloseTo(ALIEN_CELL_PX * SCALE_X, 5);
    expect(FORMATION.rowSpacing).toBeCloseTo(ALIEN_CELL_PX * SCALE_Z, 5);
    expect(FORMATION.startOriginX).toBeCloseTo(
      formationTopLeftForWave(1).x,
      5,
    );
    expect(FORMATION.startOriginZ).toBeCloseTo(
      formationTopLeftForWave(1).z,
      5,
    );
    expect(PLAYER.z).toBeCloseTo(UFO.z - (0xd0 - 0x20) * SCALE_Z, 5);
    expect(BUNKER.z).toBeLessThan(FORMATION.startOriginZ);
    expect(BUNKER.z).toBeGreaterThan(PLAYER.z);
    expect(UFO.z).toBeGreaterThan(FORMATION.startOriginZ);
  });

  it('clamps player so the ship silhouette stays on the green line', () => {
    const game = startGame();
    // Freeze rack; park shot slots so alien fire cannot reset the ship
    game.state.alienHitFreezeTimer = 999;
    clearAlienShots(game.state.alienShots);
    for (const slot of allAlienShotSlots(game.state.alienShots)) {
      slot.state = 'exploding';
      slot.explosionFramesRemaining = 10_000;
    }
    const max = playerMaxAbsX();
    dispatch(game, { type: 'move', dir: 1 });
    for (let i = 0; i < 400; i++) step(game, TICK_DT);
    expect(game.state.player.x).toBeCloseTo(max, 5);
    expect(Math.abs(game.state.player.x) + PLAYER.halfWidth).toBeLessThanOrEqual(
      GROUND_LINE.width / 2 + 1e-6,
    );

    dispatch(game, { type: 'move', dir: -1 });
    for (let i = 0; i < 800; i++) step(game, TICK_DT);
    expect(game.state.player.x).toBeCloseTo(-max, 5);
  });

  it('playerMaxAbsX matches green-line outer-edge geometry', () => {
    expect(playerMaxAbsX()).toBe(GROUND_LINE.width / 2 - PLAYER.halfWidth);
    expect(GROUND_LINE.width).toBeLessThanOrEqual(PLAYFIELD.width);
  });

  it('invasion: player explodes, formation flies away, then game over', () => {
    const game = startGame();
    drainEvents(game);
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

describe('arcade layout helpers', () => {
  it('uses ROM wave-start Yr table', () => {
    expect(refAlienYrForWave(1)).toBe(0x78);
    expect(refAlienYrForWave(2)).toBe(0x60);
    expect(refAlienYrForWave(7)).toBe(0x40);
    expect(refAlienYrForWave(10)).toBe(0x60);
    expect(formationTopLeftForWave(2).z).toBeLessThan(
      formationTopLeftForWave(1).z,
    );
  });

  it('places four shields at ROM pitch (22 + 23 gap)', () => {
    expect(SHIELD_PITCH_PX).toBe(45);
    expect([...SHIELD_LEFT_XR]).toEqual([34, 79, 124, 169]);
    const xs = SHIELD_LEFT_XR.map((_, i) => shieldCenterWorld(i).x);
    expect(xs[0]).toBeLessThan(xs[1]!);
    expect(xs[3]).toBeGreaterThan(0);
    expect(xs[0]).toBeGreaterThan(PLAYFIELD.minX);
    expect(REF_ALIEN_XR).toBe(0x38);
  });

  it('keeps ground line under the cannon band', () => {
    expect(GROUND_LINE.width).toBeGreaterThan(10);
    expect(playerMaxAbsX()).toBeGreaterThan(0);
  });
});
