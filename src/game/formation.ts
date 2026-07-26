import type { Alien, AlienType, Bunker, FormationState } from './types';
import { formationTopLeftForWave, shieldCenterWorld } from './arcadeLayout';
import {
  BUNKER,
  FORMATION,
  HIT,
  TICK_DT,
  playfieldMaxAbsCenterX,
} from './constants';

export function alienTypeForRow(row: number): AlienType {
  if (row === 0) return 'squid';
  if (row <= 2) return 'crab';
  return 'octopus';
}

export function createAliens(): Alien[] {
  const aliens: Alien[] = [];
  let id = 0;
  for (let row = 0; row < FORMATION.rows; row++) {
    for (let col = 0; col < FORMATION.cols; col++) {
      aliens.push({
        id: id++,
        col,
        row,
        type: alienTypeForRow(row),
        alive: true,
      });
    }
  }
  return aliens;
}

export function createFormation(wave: number): FormationState {
  const origin = formationTopLeftForWave(wave);
  const total = FORMATION.cols * FORMATION.rows;
  return {
    originX: origin.x,
    originZ: origin.z,
    dir: 1,
    stepTimer: 0,
    stepInterval: stepIntervalForCount(total, wave),
    animFrame: 0,
    marchNote: 0,
  };
}

export function aliveCount(aliens: Alien[]): number {
  return aliens.reduce((n, a) => n + (a.alive ? 1 : 0), 0);
}

/**
 * Arcade: one alien redrawn per 60 Hz frame → rack advances every `alive` frames.
 * Wave only affects start height (see createFormation), not step cadence.
 */
export function stepIntervalForCount(alive: number, _wave = 1): number {
  const n = Math.max(1, alive);
  return Math.max(FORMATION.minInterval, n * TICK_DT);
}

/** Horizontal step size; last alien moves 3 px when going right. */
export function formationStepX(alive: number, dir: 1 | -1): number {
  if (alive === 1 && dir === 1) return FORMATION.stepXLastRight;
  return FORMATION.stepX;
}

export function alienWorldPos(
  alien: Alien,
  formation: FormationState,
): { x: number; z: number } {
  return {
    x: formation.originX + alien.col * FORMATION.colSpacing,
    z: formation.originZ - alien.row * FORMATION.rowSpacing,
  };
}

/** Returns true if formation should drop next (edge hit). */
export function formationWouldHitEdge(
  aliens: Alien[],
  formation: FormationState,
  stepX = FORMATION.stepX,
): boolean {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const a of aliens) {
    if (!a.alive) continue;
    const p = alienWorldPos(a, formation);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }
  if (!Number.isFinite(minX)) return false;
  const dx = formation.dir * stepX;
  const limit = playfieldMaxAbsCenterX(HIT.alienHalfW);
  return maxX + dx > limit || minX + dx < -limit;
}

export function bunkerXs(): number[] {
  return Array.from({ length: BUNKER.count }, (_, i) => shieldCenterWorld(i).x);
}

export function createBunkers(): Bunker[] {
  return bunkerXs().map((x) => ({
    x,
    z: BUNKER.z,
    cols: BUNKER.cols,
    rows: BUNKER.rows,
    cells: [...BUNKER.mask],
  }));
}

export function bunkerCellWorld(
  bunker: Bunker,
  index: number,
): { x: number; z: number } | null {
  if (bunker.cells[index] !== 1) return null;
  const col = index % bunker.cols;
  const row = Math.floor(index / bunker.cols);
  const w = bunker.cols * BUNKER.cellSize;
  const d = bunker.rows * BUNKER.cellDepth;
  return {
    x: bunker.x - w / 2 + (col + 0.5) * BUNKER.cellSize,
    z: bunker.z + d / 2 - (row + 0.5) * BUNKER.cellDepth,
  };
}
