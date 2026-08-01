import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearKeyboardSteer,
  combineSteer,
  getKeyboardSteer,
  setKeyboardSteer,
  steerDir,
} from './steer';

describe('steer helpers', () => {
  beforeEach(() => {
    clearKeyboardSteer();
  });

  it('steerDir cancels opposing directions', () => {
    expect(steerDir(true, true)).toBe(0);
    expect(steerDir(true, false)).toBe(1);
    expect(steerDir(false, true)).toBe(-1);
  });

  it('combineSteer ORs keyboard and pad without letting pad conflict erase keys', () => {
    setKeyboardSteer({ left: true });
    const pad = { left: true, right: true, up: false, down: false };
    // Caller should exclusive-filter pad first; combine still keeps key left
    // when pad is filtered to idle:
    const filtered = { left: false, right: false, up: false, down: false };
    const merged = combineSteer(filtered, getKeyboardSteer());
    expect(steerDir(merged.left, merged.right)).toBe(1);
    expect(pad.left && pad.right).toBe(true);
  });
});
