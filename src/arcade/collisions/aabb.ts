/** Axis-aligned bounding box overlap on the XZ playfield. */
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
  return Math.abs(ax - bx) <= ahw + bhw && Math.abs(az - bz) <= ahd + bhd;
}
