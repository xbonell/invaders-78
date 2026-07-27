import { describe, expect, it } from 'vitest';
import { GROUND_LINE, PLAYFIELD } from './constants';
import {
  PLAY_VIEW_MARGIN,
  playViewAspect,
  playViewDepth,
  playViewInsetXPercent,
  playViewInsetYPercent,
  playViewWidth,
} from './playView';

describe('playView', () => {
  it('matches camera frame (ground + margin × playfield depth + margin)', () => {
    expect(PLAY_VIEW_MARGIN).toBe(1);
    expect(playViewWidth()).toBe(GROUND_LINE.width + 2 * PLAY_VIEW_MARGIN);
    expect(playViewDepth()).toBe(PLAYFIELD.depth + 2 * PLAY_VIEW_MARGIN);
    expect(playViewAspect()).toBe(playViewWidth() / playViewDepth());
  });

  it('converts PLAY_VIEW_MARGIN into CSS percent insets', () => {
    // If we apply the percent inset to the stage frame width/height, we should get back margin (in world units).
    expect((playViewInsetXPercent() / 100) * playViewWidth()).toBeCloseTo(PLAY_VIEW_MARGIN, 10);
    expect((playViewInsetYPercent() / 100) * playViewDepth()).toBeCloseTo(PLAY_VIEW_MARGIN, 10);
  });
});
