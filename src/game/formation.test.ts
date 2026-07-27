import { describe, expect, it } from 'vitest';
import { ALIEN_SHOT, FORMATION, GROUND_LINE, HIT, PLAYER, PLAYFIELD, TICK_DT, UFO, playfieldMaxAbsCenterX } from './constants';
import {
  createBunkers,
  formationStepX,
  formationWouldHitEdge,
  stepIntervalForCount,
} from './formation';
import { forceActivateShot } from './alienShots';
import { erodeBunkerAt } from './collisions';
import {
  __spawnUfoForTest,
  createGame,
  dispatch,
  drainEvents,
  step,
} from './simulation';

describe('formation', () => {
  it('shortens step interval as aliens die (1/N frames)', () => {
    const full = stepIntervalForCount(FORMATION.cols * FORMATION.rows, 1);
    const few = stepIntervalForCount(5, 1);
    expect(few).toBeLessThan(full);
    expect(full).toBeCloseTo(55 / 60, 5);
  });

  it('uses larger step when last alien moves right', () => {
    expect(formationStepX(1, 1)).toBe(FORMATION.stepXLastRight);
    expect(formationStepX(1, -1)).toBe(FORMATION.stepX);
    expect(formationStepX(2, 1)).toBe(FORMATION.stepX);
  });

  it('reverses and drops before aliens leave the game area', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    const beforeZ = game.state.formation.originZ;
    const beforeDir = game.state.formation.dir;
    const limit = playfieldMaxAbsCenterX(HIT.alienHalfW);
    // Current rim OK; next step would push past
    game.state.formation.originX = limit - 10 * FORMATION.colSpacing;
    expect(
      formationWouldHitEdge(game.state.aliens, game.state.formation),
    ).toBe(true);
    game.state.formation.stepTimer = game.state.formation.stepInterval;
    step(game, TICK_DT);
    expect(game.state.formation.dir).toBe(-beforeDir as 1 | -1);
    expect(game.state.formation.originZ).toBeLessThan(beforeZ);
    for (const a of game.state.aliens) {
      if (!a.alive) continue;
      const p = game.getAlienWorldPos(a);
      expect(Math.abs(p.x) + HIT.alienHalfW).toBeLessThanOrEqual(
        GROUND_LINE.width / 2 + 1e-6,
      );
    }
  });


  it('clears wave when all aliens die', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    for (const a of game.state.aliens) a.alive = false;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('waveClear');
    const events = drainEvents(game);
    expect(events.some((e) => e.type === 'waveClear')).toBe(true);
  });

  it('freezes formation briefly after an alien kill', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    const alien = game.state.aliens.find((a) => a.alive)!;
    const pos = game.getAlienWorldPos(alien);
    game.state.playerBullet = {
      x: pos.x,
      z: pos.z,
      vz: 20,
      fromPlayer: true,
    };
    const originX = game.state.formation.originX;
    game.state.formation.stepTimer = game.state.formation.stepInterval;
    step(game, TICK_DT);
    expect(alien.alive).toBe(false);
    expect(game.state.alienHitFreezeTimer).toBeGreaterThan(0);
    expect(game.state.formation.originX).toBe(originX);
  });

  it('keeps alien shots moving during kill freeze', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    const alien = game.state.aliens.find((a) => a.alive)!;
    const pos = game.getAlienWorldPos(alien);
    game.state.playerBullet = {
      x: pos.x,
      z: pos.z,
      vz: 20,
      fromPlayer: true,
    };
    step(game, TICK_DT);
    expect(game.state.alienHitFreezeTimer).toBeGreaterThan(0);

    forceActivateShot(game.state.alienShots.rolling, 100, 40);
    game.state.alienShots.nextSlotToProcess = 0;
    const shotY = game.state.alienShots.rolling.position.y;
    const originX = game.state.formation.originX;
    game.state.formation.stepTimer = game.state.formation.stepInterval;

    step(game, TICK_DT);

    expect(game.state.alienHitFreezeTimer).toBeGreaterThan(0);
    expect(game.state.formation.originX).toBe(originX);
    expect(game.state.alienShots.rolling.position.y).toBe(
      shotY + ALIEN_SHOT.normalStepPixels,
    );
  });
});

describe('bunkers', () => {
  it('erodes a cell on bullet overlap', () => {
    const bunkers = createBunkers();
    const bunker = bunkers[0]!;
    const solid = bunker.cells.findIndex((c) => c === 1);
    expect(solid).toBeGreaterThanOrEqual(0);
    const before = bunker.cells.reduce((n, c) => n + c, 0);
    let hit = false;
    for (let x = bunker.x - 2; x <= bunker.x + 2; x += 0.15) {
      for (let z = bunker.z - 1.5; z <= bunker.z + 1.5; z += 0.15) {
        if (erodeBunkerAt(bunker, { x, z, vz: 0, fromPlayer: true })) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    expect(hit).toBe(true);
    const after = bunker.cells.reduce((n, c) => n + c, 0);
    expect(after).toBe(before - 1);
  });
});

describe('ufo', () => {
  it('uses authentic 15-entry mystery table', () => {
    expect(UFO.scoreTable).toHaveLength(15);
    expect(UFO.scoreTable[8]).toBe(300);
    expect(UFO.spawnInterval).toBeCloseTo(25.6, 5);
  });

  it('awards mystery table score on hit from shot pointer', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    game.state.shotCount = 1;
    game.state.shotCounts[0] = 1;
    const ufo = __spawnUfoForTest(game);
    game.state.playerBullet = {
      x: ufo.x,
      z: ufo.z,
      vz: 10,
      fromPlayer: true,
    };
    step(game, TICK_DT);
    expect(game.state.ufo).toBeNull();
    expect(game.state.score).toBe(UFO.scoreTable[1]);
    const events = drainEvents(game);
    expect(events.some((e) => e.type === 'ufoHit')).toBe(true);
  });

  it('scores 300 when shot pointer is at index 8', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    game.state.shotCount = 8;
    game.state.shotCounts[0] = 8;
    const ufo = __spawnUfoForTest(game);
    game.state.playerBullet = {
      x: ufo.x,
      z: ufo.z,
      vz: 10,
      fromPlayer: true,
    };
    step(game, TICK_DT);
    expect(game.state.score).toBe(300);
  });

  it('does not spawn when fewer than 8 aliens remain', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    for (const a of game.state.aliens) a.alive = false;
    for (let i = 0; i < 7; i++) game.state.aliens[i]!.alive = true;
    game.state.ufoSpawnTimer = 0;
    step(game, TICK_DT);
    expect(game.state.ufo).toBeNull();
  });

  it('advances light frames every 12 ticks in travel direction', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    game.state.shotCount = 1;
    const ufo = __spawnUfoForTest(game);
    expect(ufo.vx).toBeGreaterThan(0);
    expect(ufo.animFrame).toBe(0);

    for (let i = 0; i < 11; i++) step(game, TICK_DT);
    expect(game.state.ufo!.animFrame).toBe(0);

    step(game, TICK_DT);
    expect(game.state.ufo!.animFrame).toBe(1);

    for (let i = 0; i < 12; i++) step(game, TICK_DT);
    expect(game.state.ufo!.animFrame).toBe(2);

    for (let i = 0; i < 12; i++) step(game, TICK_DT);
    expect(game.state.ufo!.animFrame).toBe(0);
  });

  it('reverses light chase when flying left', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    game.state.shotCount = 0;
    const ufo = __spawnUfoForTest(game);
    expect(ufo.vx).toBeLessThan(0);
    expect(ufo.animFrame).toBe(0);

    for (let i = 0; i < 12; i++) step(game, TICK_DT);
    expect(game.state.ufo!.animFrame).toBe(2);

    for (let i = 0; i < 12; i++) step(game, TICK_DT);
    expect(game.state.ufo!.animFrame).toBe(1);
  });

  it('includes animFrame on ufoHit', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    game.state.shotCount = 1;
    const ufo = __spawnUfoForTest(game);
    ufo.animFrame = 2;
    game.state.playerBullet = {
      x: ufo.x,
      z: ufo.z,
      vz: 10,
      fromPlayer: true,
    };
    step(game, TICK_DT);
    const hit = drainEvents(game).find((e) => e.type === 'ufoHit');
    expect(hit).toEqual(
      expect.objectContaining({ type: 'ufoHit', animFrame: 2 }),
    );
  });
});

describe('bonus life', () => {
  it('grants an extra life at 1500', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    expect(game.state.lives).toBe(PLAYER.startLives);
    const alien = game.state.aliens.find((a) => a.type === 'squid' && a.alive)!;
    game.state.scores[0] = PLAYER.bonusLifeAt - 10;
    game.state.score = PLAYER.bonusLifeAt - 10;
    const pos = game.getAlienWorldPos(alien);
    game.state.playerBullet = {
      x: pos.x,
      z: pos.z,
      vz: 20,
      fromPlayer: true,
    };
    step(game, TICK_DT);
    expect(game.state.score).toBe(PLAYER.bonusLifeAt + 20);
    expect(game.state.lives).toBe(PLAYER.startLives + 1);
    expect(game.state.bonusLifeAwarded[0]).toBe(true);
  });
});
