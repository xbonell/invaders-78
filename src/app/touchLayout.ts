/** Normalized touch pad layout (centers as 0–1 of stage width/height). */

export type TouchLayout = {
  stickX: number;
  stickY: number;
  fireX: number;
  fireY: number;
};

/** Padding from stage edge to control outline (CSS px, before chrome zoom). */
export const LAYOUT_PAD_PX = 12;

/** Stick radius — keep in sync with TouchControls visual. */
export const STICK_HALF_PX = 56;

/** Fire button half-size (5.5rem / 2 at 16px root). */
export const FIRE_HALF_PX = 44;

/** Pause sits above Fire; extra top clearance so Pause stays on-stage. */
export const FIRE_PAUSE_CLEARANCE_PX = 40;

export type LayoutInsets = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function axisInset(
  halfPx: number,
  stage: number,
  scale: number,
  extra = 0,
): { min: number; max: number } {
  if (stage <= 0) return { min: 0.5, max: 0.5 };
  const inset = (LAYOUT_PAD_PX + halfPx * scale + extra) / stage;
  const min = Math.min(inset, 0.5);
  const max = Math.max(1 - inset, min);
  return { min, max };
}

/** Visible-range insets for stick / fire centers given stage size + chrome scale. */
export function layoutInsets(
  stageW: number,
  stageH: number,
  scale = 1,
): { stick: LayoutInsets; fire: LayoutInsets } {
  const stickX = axisInset(STICK_HALF_PX, stageW, scale);
  const stickY = axisInset(STICK_HALF_PX, stageH, scale);
  const fireX = axisInset(FIRE_HALF_PX, stageW, scale);
  const fireY = axisInset(FIRE_HALF_PX, stageH, scale, FIRE_PAUSE_CLEARANCE_PX * scale);
  return {
    stick: { minX: stickX.min, maxX: stickX.max, minY: stickY.min, maxY: stickY.max },
    fire: { minX: fireX.min, maxX: fireX.max, minY: fireY.min, maxY: fireY.max },
  };
}

export function clamp01(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/** Snap each pad center into the visible stage (nearest in-range point). */
export function clampLayout(
  layout: TouchLayout,
  stageW: number,
  stageH: number,
  scale = 1,
): TouchLayout {
  const { stick, fire } = layoutInsets(stageW, stageH, scale);
  return {
    stickX: clamp01(layout.stickX, stick.minX, stick.maxX),
    stickY: clamp01(layout.stickY, stick.minY, stick.maxY),
    fireX: clamp01(layout.fireX, fire.minX, fire.maxX),
    fireY: clamp01(layout.fireY, fire.minY, fire.maxY),
  };
}

export function layoutsEqual(a: TouchLayout, b: TouchLayout): boolean {
  return (
    a.stickX === b.stickX && a.stickY === b.stickY && a.fireX === b.fireX && a.fireY === b.fireY
  );
}

/** Bottom-left stick + bottom-right fire, padded from corners. */
export function defaultTouchLayout(stageW: number, stageH: number, scale = 1): TouchLayout {
  const { stick, fire } = layoutInsets(stageW, stageH, scale);
  return {
    stickX: stick.minX,
    stickY: stick.maxY,
    fireX: fire.maxX,
    fireY: fire.maxY,
  };
}

/**
 * Fallback defaults before the stage is measured (approx corners on a typical phone stage).
 * Replaced by `defaultTouchLayout` / clamp once size is known.
 */
export const DEFAULT_TOUCH_LAYOUT: TouchLayout = {
  stickX: 0.12,
  stickY: 0.88,
  fireX: 0.88,
  fireY: 0.88,
};

export function isTouchLayout(value: unknown): value is TouchLayout {
  if (!value || typeof value !== 'object') return false;
  if (!('stickX' in value) || !('stickY' in value) || !('fireX' in value) || !('fireY' in value)) {
    return false;
  }
  const { stickX, stickY, fireX, fireY } = value;
  return (
    typeof stickX === 'number' &&
    typeof stickY === 'number' &&
    typeof fireX === 'number' &&
    typeof fireY === 'number' &&
    Number.isFinite(stickX) &&
    Number.isFinite(stickY) &&
    Number.isFinite(fireX) &&
    Number.isFinite(fireY)
  );
}

export const TOUCH_LAYOUT_KEY = 'invaders-78-touch-layout';

/** Load raw stored layout (or defaults). Call `clampLayout` once stage size is known. */
export function loadTouchLayout(): TouchLayout {
  try {
    const raw = localStorage.getItem(TOUCH_LAYOUT_KEY);
    if (!raw) return { ...DEFAULT_TOUCH_LAYOUT };
    const parsed: unknown = JSON.parse(raw);
    if (!isTouchLayout(parsed)) return { ...DEFAULT_TOUCH_LAYOUT };
    return { ...parsed };
  } catch {
    return { ...DEFAULT_TOUCH_LAYOUT };
  }
}

export function saveTouchLayout(layout: TouchLayout): void {
  try {
    localStorage.setItem(TOUCH_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export function hasStoredTouchLayout(): boolean {
  try {
    return localStorage.getItem(TOUCH_LAYOUT_KEY) != null;
  } catch {
    return false;
  }
}
