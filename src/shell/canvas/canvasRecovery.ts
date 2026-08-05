/** Pure helpers for recovering the play canvas after fullscreen / context loss. */

export type Size2D = { width: number; height: number };

/** Reject non-positive / non-finite sizes (common mid-fullscreen-transition). */
export function positiveSize(width: number, height: number): Size2D | null {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (!(width > 0) || !(height > 0)) return null;
  return { width, height };
}

/**
 * Measure a host element and apply a positive size.
 * Returns false when the host is missing or still 0×0.
 */
export function applyHostSize(
  measure: () => Size2D | null | undefined,
  apply: (width: number, height: number) => void,
): boolean {
  const raw = measure();
  if (!raw) return false;
  const size = positiveSize(raw.width, raw.height);
  if (!size) return false;
  apply(size.width, size.height);
  return true;
}

/** Remount key bump — forces a fresh WebGL context after context loss. */
export function bumpCanvasMountKey(key: number): number {
  return key + 1;
}

/**
 * After fullscreen layout, remount when size sync failed, the GL context is
 * lost, or the drawing buffer collapsed (blank canvas, HUD still visible).
 */
export function canvasNeedsRemount(opts: {
  sizeApplied: boolean;
  contextLost: boolean;
  bufferWidth: number;
  bufferHeight: number;
}): boolean {
  if (!opts.sizeApplied || opts.contextLost) return true;
  return !(opts.bufferWidth > 0) || !(opts.bufferHeight > 0);
}
