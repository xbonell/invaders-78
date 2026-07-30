import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOUCH_LAYOUT,
  clampLayout,
  clamp01,
  defaultTouchLayout,
  isTouchLayout,
  layoutsEqual,
} from './touchLayout';

describe('touchLayout', () => {
  it('clamp01 snaps to nearest bound', () => {
    expect(clamp01(-1, 0.1, 0.9)).toBe(0.1);
    expect(clamp01(0.5, 0.1, 0.9)).toBe(0.5);
    expect(clamp01(2, 0.1, 0.9)).toBe(0.9);
  });

  it('clampLayout keeps pads inside the stage for the given size', () => {
    const next = clampLayout({ stickX: -1, stickY: 2, fireX: 1.5, fireY: -0.2 }, 400, 500, 1);
    expect(next.stickX).toBeGreaterThan(0);
    expect(next.stickX).toBeLessThan(0.5);
    expect(next.stickY).toBeGreaterThan(0.5);
    expect(next.stickY).toBeLessThan(1);
    expect(next.fireX).toBeGreaterThan(0.5);
    expect(next.fireY).toBeGreaterThan(0);
    expect(next.fireY).toBeLessThan(1);
  });

  it('clampLayout is idempotent when already in range', () => {
    const layout = defaultTouchLayout(400, 500, 1);
    expect(clampLayout(layout, 400, 500, 1)).toEqual(layout);
  });

  it('defaultTouchLayout parks stick BL and fire BR', () => {
    const layout = defaultTouchLayout(400, 500, 1);
    expect(layout.stickX).toBeLessThan(0.5);
    expect(layout.fireX).toBeGreaterThan(0.5);
    expect(layout.stickY).toBeGreaterThan(0.5);
    expect(layout.fireY).toBeGreaterThan(0.5);
    expect(layoutsEqual(layout, clampLayout(layout, 400, 500, 1))).toBe(true);
  });

  it('isTouchLayout validates shape', () => {
    expect(isTouchLayout(DEFAULT_TOUCH_LAYOUT)).toBe(true);
    expect(isTouchLayout({ stickX: 0, stickY: 0 })).toBe(false);
    expect(isTouchLayout(null)).toBe(false);
  });
});
