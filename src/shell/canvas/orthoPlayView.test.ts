import { describe, expect, it } from 'vitest';
import { orthoPlayViewFrustum, shouldUpdateOrthoFrustum } from './orthoPlayView';

describe('shouldUpdateOrthoFrustum', () => {
  it('updates when canvas pixel size changes even if aspect is unchanged', () => {
    // Fullscreen often grows the stage without changing aspect (CSS aspect-ratio).
    // R3F may stomp the ortho frustum to pixel units on that resize; we must re-apply.
    expect(
      shouldUpdateOrthoFrustum({ width: 800, height: 900 }, { width: 1200, height: 1350 }),
    ).toBe(true);
  });

  it('skips when size is unchanged', () => {
    expect(shouldUpdateOrthoFrustum({ width: 800, height: 900 }, { width: 800, height: 900 })).toBe(
      false,
    );
  });

  it('skips non-positive sizes (mid-transition)', () => {
    expect(shouldUpdateOrthoFrustum({ width: 800, height: 900 }, { width: 0, height: 0 })).toBe(
      false,
    );
  });
});

describe('orthoPlayViewFrustum', () => {
  it('contain-fits play view for a matching stage aspect', () => {
    const aspect = 800 / 900;
    const f = orthoPlayViewFrustum(aspect, 30, 28);
    expect(f.right - f.left).toBeGreaterThan(0);
    expect(f.top - f.bottom).toBeGreaterThan(0);
    expect((f.right - f.left) / (f.top - f.bottom)).toBeCloseTo(aspect, 5);
  });
});
