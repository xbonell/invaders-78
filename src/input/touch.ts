/** Default stick deadzone as fraction of max radius (gamepad-like). */
export const STICK_DEADZONE = 0.35;

/**
 * Normalized stick X in [-1, 1] (negative = screen left) → move/menu dir.
 * Camera flip: screen-left → +1 (same as keyboard/pad).
 */
export function stickAxisToDir(nx: number, deadzone: number = STICK_DEADZONE): -1 | 0 | 1 {
  if (nx <= -deadzone) return 1;
  if (nx >= deadzone) return -1;
  return 0;
}

/** Pixel offset from stick base → normalized X in [-1, 1]. */
export function stickOffsetToNx(dx: number, radius: number): number {
  if (radius <= 0) return 0;
  const nx = dx / radius;
  if (nx < -1) return -1;
  if (nx > 1) return 1;
  return nx;
}

/** Clamp knob offset to max radius (preserves angle). */
export function clampKnob(dx: number, dy: number, radius: number): { dx: number; dy: number } {
  const len = Math.hypot(dx, dy);
  if (len === 0 || len <= radius) return { dx, dy };
  const s = radius / len;
  return { dx: dx * s, dy: dy * s };
}

/**
 * Edge-trigger menu select when entering an active dir from idle or the opposite side.
 * Returns the dir to pass to `selectMenu`, or 0 if no edge.
 */
export function menuSelectEdge(prevDir: -1 | 0 | 1, nextDir: -1 | 0 | 1): -1 | 0 | 1 {
  if (nextDir !== 0 && nextDir !== prevDir) return nextDir;
  return 0;
}
