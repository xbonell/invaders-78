import { describe, expect, it } from 'vitest';
import { FORMATION, TICK_DT, UFO } from './constants';
import {
  createBunkers,
  formationWouldHitEdge,
  stepIntervalForCount,
} from './formation';
import { erodeBunkerAt } from './collisions';
import {
  __spawnUfoForTest,
  createGame,
  dispatch,
  drainEvents,
  step,
} from './simulation';

describe('formation', () => {
  it('shortens step interval as aliens die', () => {
    const full = stepIntervalForCount(FORMATION.cols * FORMATION.rows, 1);
    const few = stepIntervalForCount(5, 1);
    expect(few).toBeLessThan(full);
  });

  it('reverses and drops at playfield edge', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    const beforeZ = game.state.formation.originZ;
    const beforeDir = game.state.formation.dir;
    // force near edge
    game.state.formation.originX = 20;
    expect(
      formationWouldHitEdge(game.state.aliens, game.state.formation),
    ).toBe(true);
    game.state.formation.stepTimer = game.state.formation.stepInterval;
    step(game, TICK_DT);
    expect(game.state.formation.dir).toBe(-beforeDir as 1 | -1);
    expect(game.state.formation.originZ).toBeLessThan(beforeZ);
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
  it('awards mystery table score on hit', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    game.state.shotCount = 1;
    const ufo = __spawnUfoForTest(game);
    game.state.playerBullet = {
      x: ufo.x,
      z: ufo.z,
      vz: 10,
      fromPlayer: true,
    };
    step(game, TICK_DT);
    expect(game.state.ufo).toBeNull();
    expect(UFO.scoreTable).toContain(game.state.score);
    const events = drainEvents(game);
    expect(events.some((e) => e.type === 'ufoHit')).toBe(true);
  });
});
