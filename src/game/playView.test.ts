import { describe, expect, it } from 'vitest';
import { GROUND_LINE, PLAYFIELD } from './constants';
import {
  PLAY_VIEW_MARGIN,
  playViewAspect,
  playViewDepth,
  playViewWidth,
} from './playView';

describe('playView', () => {
  it('matches camera frame (ground + margin × playfield depth + margin)', () => {
    expect(PLAY_VIEW_MARGIN).toBe(1);
    expect(playViewWidth()).toBe(GROUND_LINE.width + 2 * PLAY_VIEW_MARGIN);
    expect(playViewDepth()).toBe(PLAYFIELD.depth + 2 * PLAY_VIEW_MARGIN);
    expect(playViewAspect()).toBe(playViewWidth() / playViewDepth());
  });
});
