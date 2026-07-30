import { describe, expect, it } from 'vitest';
import {
  STICK_DEADZONE,
  clampKnob,
  menuSelectEdge,
  stickAxisToDir,
  stickOffsetToNx,
} from './touch';

describe('stickAxisToDir', () => {
  it('returns 0 inside deadzone', () => {
    expect(stickAxisToDir(0)).toBe(0);
    expect(stickAxisToDir(STICK_DEADZONE - 0.01)).toBe(0);
    expect(stickAxisToDir(-(STICK_DEADZONE - 0.01))).toBe(0);
  });

  it('maps screen-left (negative nx) to dir +1', () => {
    expect(stickAxisToDir(-STICK_DEADZONE)).toBe(1);
    expect(stickAxisToDir(-1)).toBe(1);
  });

  it('maps screen-right (positive nx) to dir -1', () => {
    expect(stickAxisToDir(STICK_DEADZONE)).toBe(-1);
    expect(stickAxisToDir(1)).toBe(-1);
  });

  it('respects custom deadzone', () => {
    expect(stickAxisToDir(0.3, 0.4)).toBe(0);
    expect(stickAxisToDir(0.5, 0.4)).toBe(-1);
  });
});

describe('stickOffsetToNx', () => {
  it('normalizes dx by radius and clamps', () => {
    expect(stickOffsetToNx(0, 40)).toBe(0);
    expect(stickOffsetToNx(20, 40)).toBe(0.5);
    expect(stickOffsetToNx(-40, 40)).toBe(-1);
    expect(stickOffsetToNx(80, 40)).toBe(1);
  });

  it('returns 0 when radius is non-positive', () => {
    expect(stickOffsetToNx(10, 0)).toBe(0);
    expect(stickOffsetToNx(10, -1)).toBe(0);
  });
});

describe('clampKnob', () => {
  it('leaves offsets inside radius unchanged', () => {
    expect(clampKnob(10, 0, 40)).toEqual({ dx: 10, dy: 0 });
  });

  it('clamps to radius on the same angle', () => {
    const { dx, dy } = clampKnob(80, 0, 40);
    expect(dx).toBeCloseTo(40);
    expect(dy).toBeCloseTo(0);
  });
});

describe('menuSelectEdge', () => {
  it('emits when entering an active dir from idle', () => {
    expect(menuSelectEdge(0, 1)).toBe(1);
    expect(menuSelectEdge(0, -1)).toBe(-1);
  });

  it('does not re-emit while held', () => {
    expect(menuSelectEdge(1, 1)).toBe(0);
    expect(menuSelectEdge(-1, -1)).toBe(0);
  });

  it('emits when switching sides', () => {
    expect(menuSelectEdge(1, -1)).toBe(-1);
    expect(menuSelectEdge(-1, 1)).toBe(1);
  });

  it('emits nothing when returning to idle', () => {
    expect(menuSelectEdge(1, 0)).toBe(0);
    expect(menuSelectEdge(0, 0)).toBe(0);
  });
});
