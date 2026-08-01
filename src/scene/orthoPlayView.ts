import { playViewDepth, playViewWidth } from '../game/playView';

export type Size2D = { width: number; height: number };

export type OrthoFrustum = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/**
 * Re-apply when the canvas CSS pixel size changes — not only when aspect
 * changes. Stage CSS keeps a fixed aspect-ratio, so fullscreen often resizes
 * without an aspect delta; R3F's default ortho update would otherwise leave a
 * pixel-unit frustum and the playfield vanishes while DOM HUD stays.
 */
export function shouldUpdateOrthoFrustum(prev: Size2D, next: Size2D): boolean {
  if (!(next.width > 0) || !(next.height > 0)) return false;
  return prev.width !== next.width || prev.height !== next.height;
}

/** Contain-fit play-view world units to the canvas aspect. */
export function orthoPlayViewFrustum(aspect: number): OrthoFrustum {
  const halfW = playViewWidth() / 2;
  const halfD = playViewDepth() / 2;
  let viewH = halfD * 2;
  let viewW = viewH * aspect;
  if (viewW < halfW * 2) {
    viewW = halfW * 2;
    viewH = viewW / aspect;
  }
  return {
    left: -viewW / 2,
    right: viewW / 2,
    top: viewH / 2,
    bottom: -viewH / 2,
  };
}
