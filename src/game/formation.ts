import type { Alien, AlienType, Bunker, FormationState } from './types';
import { BUNKER, FORMATION, PLAYFIELD } from './constants';

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
  const dropSteps = Math.min(wave - 1, FORMATION.maxWaveDropSteps);
  const tighter = dropSteps * FORMATION.waveDrop;
  return {
    originX: FORMATION.startOriginX,
    originZ: FORMATION.startOriginZ - tighter,
    dir: 1,
    stepTimer: 0,
    stepInterval: Math.max(
      FORMATION.minInterval,
      FORMATION.baseInterval - dropSteps * FORMATION.waveSpeedBoost,
    ),
    animFrame: 0,
    marchNote: 0,
  };
}

export function aliveCount(aliens: Alien[]): number {
  return aliens.reduce((n, a) => n + (a.alive ? 1 : 0), 0);
}

export function stepIntervalForCount(alive: number, wave: number): number {
  const total = FORMATION.cols * FORMATION.rows;
  const ratio = alive / total;
  const waveBoost =
    Math.min(Math.max(0, wave - 1), FORMATION.maxWaveDropSteps) *
    FORMATION.waveSpeedBoost;
  // Non-linear: last few aliens get much faster (arcade feel)
  const panic = alive <= 5 ? 0.55 : alive <= 12 ? 0.75 : 1;
  return Math.max(
    FORMATION.minInterval,
    FORMATION.baseInterval * ratio * panic - waveBoost,
  );
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
  const nextOriginX = formation.originX + formation.dir * FORMATION.stepX;
  const dx = nextOriginX - formation.originX;
  return (
    maxX + dx > PLAYFIELD.maxX - 0.8 || minX + dx < PLAYFIELD.minX + 0.8
  );
}

export function bunkerXs(): number[] {
  const span = PLAYFIELD.width * 0.7;
  const start = -span / 2;
  const step = span / (BUNKER.count - 1);
  return Array.from({ length: BUNKER.count }, (_, i) => start + i * step);
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
  const d = bunker.rows * BUNKER.cellSize;
  return {
    x: bunker.x - w / 2 + (col + 0.5) * BUNKER.cellSize,
    z: bunker.z + d / 2 - (row + 0.5) * BUNKER.cellSize,
  };
}
