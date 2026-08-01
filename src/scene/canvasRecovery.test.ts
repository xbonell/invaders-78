import { describe, expect, it, vi } from 'vitest';
import {
  applyHostSize,
  bumpCanvasMountKey,
  canvasNeedsRemount,
  positiveSize,
} from './canvasRecovery';

describe('positiveSize', () => {
  it('accepts positive finite dimensions', () => {
    expect(positiveSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('rejects zero, negative, and non-finite sizes', () => {
    expect(positiveSize(0, 600)).toBeNull();
    expect(positiveSize(800, 0)).toBeNull();
    expect(positiveSize(-1, 600)).toBeNull();
    expect(positiveSize(800, Number.NaN)).toBeNull();
    expect(positiveSize(Number.POSITIVE_INFINITY, 600)).toBeNull();
  });
});

describe('applyHostSize', () => {
  it('applies measured size when positive', () => {
    const apply = vi.fn<(width: number, height: number) => void>();
    expect(applyHostSize(() => ({ width: 1280, height: 720 }), apply)).toBe(true);
    expect(apply).toHaveBeenCalledWith(1280, 720);
  });

  it('no-ops while host reports 0×0 (fullscreen transition)', () => {
    const apply = vi.fn<(width: number, height: number) => void>();
    expect(applyHostSize(() => ({ width: 0, height: 0 }), apply)).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it('no-ops when measure returns null', () => {
    const apply = vi.fn<(width: number, height: number) => void>();
    expect(applyHostSize(() => null, apply)).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });
});

describe('bumpCanvasMountKey', () => {
  it('advances the mount key so Canvas remounts after context loss', () => {
    expect(bumpCanvasMountKey(0)).toBe(1);
    expect(bumpCanvasMountKey(3)).toBe(4);
  });
});

describe('canvasNeedsRemount', () => {
  it('keeps the canvas when size synced and buffer alive', () => {
    expect(
      canvasNeedsRemount({
        sizeApplied: true,
        contextLost: false,
        bufferWidth: 1280,
        bufferHeight: 720,
      }),
    ).toBe(false);
  });

  it('remounts after context loss or dead drawing buffer', () => {
    expect(
      canvasNeedsRemount({
        sizeApplied: true,
        contextLost: true,
        bufferWidth: 1280,
        bufferHeight: 720,
      }),
    ).toBe(true);
    expect(
      canvasNeedsRemount({
        sizeApplied: true,
        contextLost: false,
        bufferWidth: 0,
        bufferHeight: 0,
      }),
    ).toBe(true);
    expect(
      canvasNeedsRemount({
        sizeApplied: false,
        contextLost: false,
        bufferWidth: 1280,
        bufferHeight: 720,
      }),
    ).toBe(true);
  });
});
