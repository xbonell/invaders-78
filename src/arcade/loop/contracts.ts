/**
 * Thin simulation façade every arcade title must expose.
 * State / command / event shapes stay game-specific (no universal ECS).
 */
export interface GameSimulation<TState, TCommand, TEvent> {
  readonly state: TState;
  dispatch(command: TCommand): void;
  step(dt: number): void;
  drainEvents(): TEvent[];
}

/**
 * Game-owned display pose bridge. Written by the loop, read by RenderBackend.
 * Snapshot shape is game-specific.
 */
export interface MotionBridge<TState, TSnapshot> {
  createSnapshot(state: TState): TSnapshot;
  /** Capture prev poses before a fixed sim step. */
  capturePrev(state: TState): void;
  /** Write interpolated snapshot after accumulator steps. */
  write(state: TState, alpha: number, snapshot: TSnapshot): void;
}

/** Side effects after draining sim events (audio, FX, persistence). */
export type EventSink<TEvent> = (events: TEvent[]) => void;
