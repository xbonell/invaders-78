/** Arcade (Xr, Yr) rotated playfield coords ↔ world XZ. */

import { LOGICAL_H, SCALE_X, SCALE_Z, logicalToWorld } from './logicalSpace';

/**
 * ROM uses Yr increasing toward the top of the playfield (away from the player).
 * Our logical Y increases toward the bottom — flip when bridging.
 */
export function arcadeToWorld(xr: number, yr: number): { x: number; z: number } {
  return logicalToWorld(xr, LOGICAL_H - yr);
}

export function worldDeltaFromArcadePixels(dx: number, dy: number): {
  x: number;
  z: number;
} {
  return { x: dx * SCALE_X, z: dy * SCALE_Z };
}

/** Bottom-left reference alien Yr at wave start (ROM 07EA + table 1DA3). */
export const ALIEN_START_YR = [
  0x78, // wave 1 (hardcoded at game start)
  0x60, 0x50, 0x48, 0x48, 0x48, 0x40, 0x40, 0x40, // waves 2–9
] as const;

export function refAlienYrForWave(wave: number): number {
  const w = Math.max(1, wave);
  if (w === 1) return ALIEN_START_YR[0]!;
  // Wave 10+ wraps to table start ($60), same as ROM
  const table = ALIEN_START_YR.slice(1);
  return table[(w - 2) % table.length]!;
}

/** Pixel pitch of one alien cell (ROM count-the-16s). */
export const ALIEN_CELL_PX = 16;

/** Wave-1 bottom-left reference alien (ROM $3878 → Xr=$38, Yr=$78). */
export const REF_ALIEN_XR = 0x38;

/** Player sprite left-edge limits and fixed Yr (ROM 1B1A / move checks). */
export const PLAYER_YR = 0x20;
export const PLAYER_XR_MIN = 0x30;
export const PLAYER_XR_MAX = 0xd9;
export const PLAYER_SPRITE_W = 16;

/** Saucer fixed Yr (ROM saucer descriptor). */
export const SAUCER_YR = 0xd0;

/**
 * Shield footprint 22×16 px. Copy loop draws 22 strips then adds $02E0 (23)
 * → pitch 45 left-to-left. Horizontal origins from accurate remakes / CA spacing
 * (34 + n×45), which centers the four bases on the 224-wide playfield.
 */
export const SHIELD_YR = 48;
export const SHIELD_W_PX = 22;
export const SHIELD_H_PX = 16;
export const SHIELD_PITCH_PX = SHIELD_W_PX + 23; // 45
export const SHIELD_LEFT_XR = [
  34,
  34 + SHIELD_PITCH_PX,
  34 + SHIELD_PITCH_PX * 2,
  34 + SHIELD_PITCH_PX * 3,
] as const; // 34, 79, 124, 169


export function shieldCenterWorld(index: number): { x: number; z: number } {
  const left = SHIELD_LEFT_XR[index]!;
  return arcadeToWorld(left + SHIELD_W_PX / 2, SHIELD_YR + SHIELD_H_PX / 2);
}

/** Top-left of the 5×11 rack for a wave (our row 0 = top / squid).
 * Horizontal origin is centered on x=0 so the rack stays inside the game area
 * (green line); vertical start still follows the ROM Yr table.
 */
export function formationTopLeftForWave(wave: number): { x: number; z: number } {
  const refYr = refAlienYrForWave(wave);
  const topYr = refYr + 4 * ALIEN_CELL_PX;
  const z = arcadeToWorld(0, topYr).z;
  const span = 10 * ALIEN_CELL_PX * SCALE_X;
  return { x: -span / 2, z };
}

/** Arcade cannon outer-edge travel width (sprite left $30 .. $D9+16), world units. */
export function groundLineWidth(): number {
  const outerLeft = arcadeToWorld(PLAYER_XR_MIN, PLAYER_YR).x;
  const outerRight = arcadeToWorld(
    PLAYER_XR_MAX + PLAYER_SPRITE_W,
    PLAYER_YR,
  ).x;
  return outerRight - outerLeft;
}

/**
 * Center-X clamp so the ship silhouette stays on the green line.
 * Band is centered at x=0 (matches the ground-line mesh).
 */
export function playerCenterXBounds(halfWidth: number): { min: number; max: number } {
  const halfLine = groundLineWidth() / 2;
  const maxAbs = halfLine - halfWidth;
  return { min: -maxAbs, max: maxAbs };
}

