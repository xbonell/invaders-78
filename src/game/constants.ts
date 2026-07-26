/** Arcade-scaled world units (XZ playfield). */

export const TICK_DT = 1 / 60;

export const PLAYFIELD = {
  width: 22,
  depth: 26,
  minX: -11,
  maxX: 11,
  minZ: -12,
  maxZ: 12,
} as const;

export const PLAYER = {
  z: -10,
  speed: 12,
  halfWidth: 0.7,
  halfDepth: 0.35,
  bulletSpeed: 22,
  startLives: 3,
  dyingDuration: 0.85,
} as const;

export const FORMATION = {
  cols: 11,
  rows: 5,
  colSpacing: 1.6,
  rowSpacing: 1.4,
  startOriginX: -8,
  startOriginZ: 6.2,
  stepX: 0.4,
  dropZ: 0.55,
  /** Initial step period with full formation (seconds) */
  baseInterval: 0.7,
  minInterval: 0.045,
  waveClearDuration: 1.2,
  /** How much lower each wave starts (world Z) */
  waveDrop: 0.7,
  maxWaveDropSteps: 5,
  /** Extra interval cut per wave */
  waveSpeedBoost: 0.07,
  /** When aliens reach the player line: formation races off-screen */
  invasionFlySpeed: 16,
  invasionDuration: 1.15,
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
  z: 11,
  speed: 5.5,
  halfWidth: 1.1,
  halfDepth: 0.4,
  scoreTable: [50, 100, 150, 300] as const,
  spawnInterval: 12,
} as const;

export const BUNKER = {
  count: 4,
  cols: 16,
  rows: 12,
  /** Grid pitch — matches player ship voxel resolution. */
  cellSize: 0.14,
  /** Vertical stack reference — keeps original bunker height. */
  stackSize: 0.28,
  /** Closer to player — matches arcade lower-playfield shields. */
  z: -8,
  // 2× nearest-neighbor upscale of the original 8×6 arch
  mask: [
    0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,
    0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
    1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
    1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
    1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
  ],
} as const;

/** Green baseline under the cannon — 1 voxel cell thick. */
export const GROUND_LINE = {
  /** Shared by mesh and player clamp (was `PLAYFIELD.width - 1` inline in Playfield). */
  width: PLAYFIELD.width - 1,
  thickness: BUNKER.cellSize,
  y: 0.02,
  /** Offset below PLAYER.z */
  zOffset: 0.85,
} as const;

/** Max |player.x| so ship outer edges stay on the green line. */
export function playerMaxAbsX(): number {
  return GROUND_LINE.width / 2 - PLAYER.halfWidth;
}

export const HIT = {
  alienHalfW: 0.55,
  alienHalfD: 0.4,
  bulletHalfW: 0.08,
  bulletHalfD: 0.25,
} as const;

export const ATTRACT = {
  screenDuration: 5,
  gameOverDuration: 4,
  demoFireInterval: 0.55,
  playerSwitchDuration: 1.6,
} as const;
