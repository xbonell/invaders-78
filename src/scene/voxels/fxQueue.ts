import type { GameEvent } from '../game/types';

const queue: GameEvent[] = [];

const FX_TYPES = new Set(['alienHit', 'ufoHit', 'playerHit', 'bunkerHit', 'alienShotHit']);

/** Push destruction events for the scene to consume (survives React frame gaps). */
export function enqueueFx(events: GameEvent[]): void {
  for (const e of events) {
    if (FX_TYPES.has(e.type)) queue.push(e);
  }
}

export function drainFxQueue(): GameEvent[] {
  if (queue.length === 0) return [];
  return queue.splice(0, queue.length);
}
