import type { Bullet, Bunker } from './types';
import { BUNKER, HIT } from './constants';
import { bunkerCellWorld } from './formation';

export function aabbOverlap(
  ax: number,
  az: number,
  ahw: number,
  ahd: number,
  bx: number,
  bz: number,
  bhw: number,
  bhd: number,
): boolean {
  return (
    Math.abs(ax - bx) <= ahw + bhw && Math.abs(az - bz) <= ahd + bhd
  );
}

export function bulletHitsPoint(
  bullet: Bullet,
  x: number,
  z: number,
  halfW: number,
  halfD: number,
): boolean {
  return aabbOverlap(
    bullet.x,
    bullet.z,
    HIT.bulletHalfW,
    HIT.bulletHalfD,
    x,
    z,
    halfW,
    halfD,
  );
}

/** Erase first overlapping bunker cell; returns true if hit. */
export function erodeBunkerAt(bunker: Bunker, bullet: Bullet): boolean {
  const half = BUNKER.cellSize * 0.55;
  for (let i = 0; i < bunker.cells.length; i++) {
    const cell = bunkerCellWorld(bunker, i);
    if (!cell) continue;
    if (bulletHitsPoint(bullet, cell.x, cell.z, half, half)) {
      bunker.cells[i] = 0;
      return true;
    }
  }
  return false;
}
