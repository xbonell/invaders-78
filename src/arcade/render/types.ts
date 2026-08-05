import type { ReactNode, MutableRefObject, RefObject } from 'react';

/** Props every Three.js-powered playfield backend receives from the shell canvas. */
export interface RenderBackendProps<TState, TSnapshot> {
  state: TState;
  version: number;
  motionSnapshot: MutableRefObject<TSnapshot>;
}

/**
 * A graphics engine for the playfield (voxels today; low-poly later).
 * Implementations live under each game's `render/` folder.
 */
export type RenderBackend<TState, TSnapshot> = (
  props: RenderBackendProps<TState, TSnapshot>,
) => ReactNode;

/** Host canvas needs only the advance callback + a scene subtree. */
export interface GameCanvasHostProps {
  advanceRef: RefObject<(now: number) => void>;
  onContextLost: () => void;
  children: ReactNode;
}
