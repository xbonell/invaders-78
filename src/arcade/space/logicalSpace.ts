/** 224×256 arcade logical playfield ↔ world XZ conversion. */

export const PLAYFIELD = {
  width: 28,
  depth: 26,
  minX: -14,
  maxX: 14,
  minZ: -12,
  maxZ: 12,
} as const;

export const LOGICAL_W = 224;
export const LOGICAL_H = 256;

export const SCALE_X = PLAYFIELD.width / LOGICAL_W;
export const SCALE_Z = PLAYFIELD.depth / LOGICAL_H;

/** Shared square world voxel pitch (playfield art reticle). */
export const VOXEL_SIZE = SCALE_X;

export interface LogicalVec2 {
  x: number;
  y: number;
}

export function worldToLogical(wx: number, wz: number): LogicalVec2 {
  return {
    x: Math.round((wx - PLAYFIELD.minX) / SCALE_X),
    y: Math.round((PLAYFIELD.maxZ - wz) / SCALE_Z),
  };
}

export function logicalToWorld(lx: number, ly: number): { x: number; z: number } {
  return {
    x: PLAYFIELD.minX + lx * SCALE_X,
    z: PLAYFIELD.maxZ - ly * SCALE_Z,
  };
}

export function worldDeltaYToLogical(worldHalfDepth: number): number {
  return worldHalfDepth / SCALE_Z;
}

export function worldDeltaXToLogical(worldHalfWidth: number): number {
  return worldHalfWidth / SCALE_X;
}
