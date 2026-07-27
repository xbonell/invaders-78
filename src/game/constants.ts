/** Arcade-scaled world units (XZ playfield). */

import {
  ALIEN_CELL_PX,
  PLAYER_YR,
  SAUCER_YR,
  SHIELD_H_PX,
  SHIELD_W_PX,
  SHIELD_YR,
  arcadeToWorld,
  formationTopLeftForWave,
  groundLineWidth,
  worldDeltaFromArcadePixels,
} from './arcadeLayout';
import { PLAYFIELD, SCALE_X, SCALE_Z } from './logicalSpace';

export { PLAYFIELD };

export const TICK_DT = 1 / 60;

const playerZ = arcadeToWorld(0, PLAYER_YR).z;
const ufoZ = arcadeToWorld(0, SAUCER_YR).z;
const wave1Origin = formationTopLeftForWave(1);
const alienPitch = worldDeltaFromArcadePixels(ALIEN_CELL_PX, ALIEN_CELL_PX);

export const PLAYER = {
  z: playerZ,
  speed: 12,
  /**
   * Must match PLAYER_RECIPE footprint (13×0.14). Was 0.7 for an old 10-wide
   * grid — too small, so the silhouette overhung the green line by ~2 cells.
   */
  halfWidth: (13 * 0.14) / 2,
  halfDepth: (8 * 0.14) / 2,
  /**
   * Top-row voxel centre of PLAYER_RECIPE (8×0.14 grid) — cannon tip.
   * Matches recipeToBits: `((rows - 1) * cell) / 2`.
   */
  bulletSpawnOffsetZ: ((8 - 1) * 0.14) / 2,
  bulletSpeed: 22,
  startLives: 3,
  dyingDuration: 0.85,
  /** Arcade DIP default: extra ship at 1500 */
  bonusLifeAt: 1500,
} as const;

export const FORMATION = {
  cols: 11,
  rows: 5,
  /** ROM 16×16 alien cells */
  colSpacing: alienPitch.x,
  rowSpacing: alienPitch.z,
  /** Wave-1 top-left (derived from ref $38,$78) */
  startOriginX: wave1Origin.x,
  startOriginZ: wave1Origin.z,
  /** Arcade: 2 px horizontal step */
  stepX: 2 * SCALE_X,
  /** Last alien moving right: 3 px (asymmetric) */
  stepXLastRight: 3 * SCALE_X,
  /** Arcade: 8 px drop */
  dropZ: 8 * SCALE_Z,
  /**
   * One alien redrawn per 60 Hz frame → full rack steps every `alive` frames.
   * Kept for createFormation initial value; runtime uses stepIntervalForCount.
   */
  baseInterval: (11 * 5) * (1 / 60),
  minInterval: 1 / 60,
  waveClearDuration: 1.2,
  /** When aliens reach the player line: formation races off-screen */
  invasionFlySpeed: 16,
  invasionDuration: 1.15,
  /** ~16 frames @ 60 Hz — rack freeze after alien kill */
  alienHitFreeze: 16 / 60,
} as const;

/** Row 0 = top (squid), rows 1-2 crab, rows 3-4 octopus */
export const ALIEN_POINTS: Record<string, number> = {
  squid: 30,
  crab: 20,
  octopus: 10,
};

/** Arcade-authentic alien shot system (logical overlay). */
export const ALIEN_SHOT = {
  simulationHz: 60,
  normalStepPixels: 4,
  acceleratedStepPixels: 5,
  acceleratedAlienCountThreshold: 8,
  inactiveMoveCounter: 255,
  explosionFrames: 8,
  projectileSpawnGap: 0,
  /** Logical Y at/beyond which shots explode */
  projectileBottomBoundary: 240,
  /** Stable logical hitbox (independent of anim frame) */
  hitboxHalfW: 1,
  hitboxHalfH: 4,
  arcadeAuthenticUfoShotSlotSharing: true,
  resetFiringPatternsEachWave: true,
} as const;

export const UFO = {
  z: ufoZ,
  speed: 5.5,
  /** Matches UFO_RECIPE 16×0.12 footprint */
  halfWidth: (16 * 0.12) / 2,
  halfDepth: 0.4,
  /**
   * ROM table @ 1D54 (×10 for points). 16th value unused — wrap after 15.
   * 300 at index 8 → after 8 completed shots, next hit scores 300 (then every 15).
   */
  scoreTable: [
    100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100,
  ] as const,
  /** 0x600 ISR ticks @ 60 Hz ≈ 25.6 s */
  spawnInterval: 0x600 / 60,
  /** Saucer only while ≥8 aliens remain */
  minAliensToSpawn: 8,
  /** Underside lights: one frame every N sim ticks (~5 swaps/sec @ 60 Hz) */
  animIntervalTicks: 12,
} as const;

/** Arcade shields: 22×16 px footprint; one cell per ROM pixel. */
const bunkerCellW = SCALE_X;
const bunkerCellD = SCALE_Z;

export const BUNKER = {
  count: 4,
  cols: SHIELD_W_PX,
  rows: SHIELD_H_PX,
  cellSize: bunkerCellW,
  cellDepth: bunkerCellD,
  /** Vertical stack reference for voxel look */
  stackSize: bunkerCellD * 2,
  /** Center Yr of 16px-tall shield at Yr=48 */
  z: arcadeToWorld(0, SHIELD_YR + SHIELD_H_PX / 2).z,
  // ROM $1D20 shield bitmap (verified vs Arcade Archives key art)
  mask: [
    0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0,
    0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
    0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,
    0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1,
  ],
} as const;

/** Green baseline under the cannon — 1 voxel cell thick. */
export const GROUND_LINE = {
  /**
   * Game-area width: arcade cannon travel, capped to the playfield.
   * Formation / UFO / player all clamp to this band.
   */
  width: Math.min(groundLineWidth(), PLAYFIELD.width),
  thickness: BUNKER.cellSize,
  y: 0.02,
  /** Offset below PLAYER.z */
  zOffset: 0.85,
} as const;

/** Half-width of the shared horizontal game area (green line). */
export function gameAreaHalfWidth(): number {
  return GROUND_LINE.width / 2;
}

/**
 * Max |center X| so an entity's outer edge stays inside the game area.
 */
export function playfieldMaxAbsCenterX(halfExtent: number): number {
  return gameAreaHalfWidth() - halfExtent;
}

/**
 * Max |player.x| so ship outer edges stay on the green line / game area.
 */
export function playerMaxAbsX(): number {
  return playfieldMaxAbsCenterX(PLAYER.halfWidth);
}

export const HIT = {
  /** Widest alien (octopus 12×0.115) — used for edge bumps vs game area */
  alienHalfW: (12 * 0.115) / 2,
  alienHalfD: (ALIEN_CELL_PX * SCALE_Z) / 2,
  bulletHalfW: 0.08,
  bulletHalfD: 0.25,
} as const;

export const ATTRACT = {
  screenDuration: 5,
  /** CSS crossfade length (UI); sim flips screen immediately on timer */
  transitionDuration: 0.5,
  /** Active carousel order. Add 'highScores' when online leaderboard ships. */
  enabledScreens: ['info', 'demo'] as const,
  gameOverDuration: 4,
  /** Min time between demo fire attempts after a shot is taken */
  demoFireCooldown: 0.35,
  /** Aim X deadzone before moveDir goes idle */
  demoMoveDeadzone: 0.12,
  /** Fire only when |player.x - aimX| is below this */
  demoAlignTol: 0.25,
  /** Lead aim point along formation march direction */
  demoLead: 0.28,
  playerSwitchDuration: 1.6,
} as const;
