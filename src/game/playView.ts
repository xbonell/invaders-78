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
