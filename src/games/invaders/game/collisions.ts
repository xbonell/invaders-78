import { aabbOverlap } from '../../../arcade/collisions/aabb';
import type { Bullet, Bunker } from './types';
import { BUNKER, HIT } from './constants';
import { bunkerCellWorld } from './formation';

export { aabbOverlap };

export function bulletHitsPoint(
  bullet: Bullet,
  x: number,
  z: number,
  halfW: number,
  halfD: number,
): boolean {
  return aabbOverlap(bullet.x, bullet.z, HIT.bulletHalfW, HIT.bulletHalfD, x, z, halfW, halfD);
}

/** True if a vertical shot at shotX from fromZ→toZ would hit a solid bunker cell. */
export function shotBlockedByBunker(
  bunkers: Bunker[],
  shotX: number,
  fromZ: number,
  toZ: number,
): boolean {
  const zLo = Math.min(fromZ, toZ);
  const zHi = Math.max(fromZ, toZ);
  const halfW = BUNKER.cellSize * 0.55;
  const halfD = BUNKER.cellDepth * 0.55;
  for (const bunker of bunkers) {
    for (let i = 0; i < bunker.cells.length; i++) {
      const cell = bunkerCellWorld(bunker, i);
      if (!cell) continue;
      if (cell.z + halfD < zLo || cell.z - halfD > zHi) continue;
      if (Math.abs(shotX - cell.x) <= HIT.bulletHalfW + halfW) {
        return true;
      }
    }
  }
  return false;
}

/** Erase first overlapping bunker cell; returns true if hit. */
export function erodeBunkerAt(bunker: Bunker, bullet: Bullet): boolean {
  const halfW = BUNKER.cellSize * 0.55;
  const halfD = BUNKER.cellDepth * 0.55;
  for (let i = 0; i < bunker.cells.length; i++) {
    const cell = bunkerCellWorld(bunker, i);
    if (!cell) continue;
    if (
      aabbOverlap(
        bullet.x,
        bullet.z,
        HIT.bulletHalfW,
        HIT.bulletHalfD,
        cell.x,
        cell.z,
        halfW,
        halfD,
      )
    ) {
      bunker.cells[i] = 0;
      return true;
    }
  }
  return false;
}
