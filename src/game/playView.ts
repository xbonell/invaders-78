import { GROUND_LINE, PLAYFIELD } from './constants';

/** World-unit margin around the playfield in the ortho frustum / CSS stage. */
export const PLAY_VIEW_MARGIN = 1;

export function playViewWidth(): number {
  return GROUND_LINE.width + 2 * PLAY_VIEW_MARGIN;
}

export function playViewDepth(): number {
  return PLAYFIELD.depth + 2 * PLAY_VIEW_MARGIN;
}

export function playViewAspect(): number {
  return playViewWidth() / playViewDepth();
}

/**
 * CSS inset (left/right) percentage so chrome aligns with the green baseline ends.
 * The chrome should align with the inner play-view frame, not the outer margin.
 */
export function playViewInsetXPercent(): number {
  return (PLAY_VIEW_MARGIN / playViewWidth()) * 100;
}

/** CSS inset (top/bottom) percentage so chrome aligns with the green baseline ends. */
export function playViewInsetYPercent(): number {
  return (PLAY_VIEW_MARGIN / playViewDepth()) * 100;
}
