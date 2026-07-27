import { describe, expect, it } from 'vitest';
import { ATTRACT, PLAYER } from './constants';
import { shotBlockedByBunker } from './collisions';
import {
  demoMoveDir,
  demoShouldFire,
  pickDemoAim,
} from './demoAi';
import {
  alienWorldPos,
  createBunkers,
  createFormation,
} from './formation';
import type { Alien, Ufo } from './types';

function alien(
  partial: Pick<Alien, 'id' | 'col' | 'row' | 'type'> & { alive?: boolean },
): Alien {
  return { alive: true, ...partial };
}

describe('demoAi', () => {
  it('prefers squid over a nearer octopus', () => {
    const formation = createFormation(1);
    const octopus = alien({ id: 0, col: 5, row: 4, type: 'octopus' });
    const squid = alien({ id: 1, col: 0, row: 0, type: 'squid' });
    const octX = alienWorldPos(octopus, formation).x;
    const squidX = alienWorldPos(squid, formation).x;
    expect(Math.abs(squidX - octX)).toBeGreaterThan(0.5);

    const { aimX, found } = pickDemoAim(
      [octopus, squid],
      formation,
      octX,
      PLAYER.z,
      null,
      [],
      0,
    );
    expect(found).toBe(true);
    expect(aimX).toBeCloseTo(squidX, 5);
  });

  it('prefers UFO over aliens when the lane is clear', () => {
    const formation = createFormation(1);
    const squid = alien({ id: 0, col: 5, row: 0, type: 'squid' });
    const ufo: Ufo = {
      x: 3,
      z: 8,
      vx: 1,
      scoreIndex: 0,
      animFrame: 0,
      animTicks: 0,
    };
    const { aimX, found } = pickDemoAim(
      [squid],
      formation,
      0,
      PLAYER.z,
      ufo,
      [],
      0,
    );
    expect(found).toBe(true);
    expect(aimX).toBe(3);
  });

  it('prefers a clear lower-value alien over a bunker-blocked squid', () => {
    const formation = createFormation(1);
    const bunkers = createBunkers();
    const bunkerX = bunkers[0]!.x;
    const squid = alien({ id: 0, col: 0, row: 0, type: 'squid' });
    const octopus = alien({ id: 1, col: 10, row: 4, type: 'octopus' });
    // Force squid world X onto bunker by shifting formation origin
    const squidAtOrigin = alienWorldPos(squid, formation);
    formation.originX += bunkerX - squidAtOrigin.x;
    const squidX = alienWorldPos(squid, formation).x;
    expect(shotBlockedByBunker(bunkers, squidX, PLAYER.z, 10)).toBe(true);

    const octX = alienWorldPos(octopus, formation).x;
    expect(shotBlockedByBunker(bunkers, octX, PLAYER.z, 10)).toBe(false);

    const { aimX, found } = pickDemoAim(
      [squid, octopus],
      formation,
      bunkerX,
      PLAYER.z,
      null,
      bunkers,
      0,
    );
    expect(found).toBe(true);
    expect(aimX).toBeCloseTo(octX, 5);
  });

  it('does not request fire when far from aim X', () => {
    expect(
      demoShouldFire(0, 2, 5, PLAYER.z, [], false, true, ATTRACT.demoAlignTol),
    ).toBe(false);
  });

  it('requests fire when aligned on a clear lane', () => {
    expect(
      demoShouldFire(1, 1.1, 5, PLAYER.z, [], false, true, ATTRACT.demoAlignTol),
    ).toBe(true);
  });

  it('does not fire through a bunker even when aligned', () => {
    const bunkers = createBunkers();
    const x = bunkers[1]!.x;
    expect(shotBlockedByBunker(bunkers, x, PLAYER.z, 10)).toBe(true);
    expect(demoShouldFire(x, x, 10, PLAYER.z, bunkers, false, true)).toBe(
      false,
    );
  });

  it('does not fire while a bullet is in flight or cooldown pending', () => {
    expect(demoShouldFire(1, 1, 5, PLAYER.z, [], true, true)).toBe(false);
    expect(demoShouldFire(1, 1, 5, PLAYER.z, [], false, false)).toBe(false);
  });

  it('moves toward aim and idles inside deadzone', () => {
    expect(demoMoveDir(0, 1)).toBe(1);
    expect(demoMoveDir(0, -1)).toBe(-1);
    expect(demoMoveDir(0, 0.05)).toBe(0);
  });
});
