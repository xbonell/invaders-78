import type { GameEvent } from '../../game/types';
import { createFxQueue } from '../../../../arcade/render/fxBridge';

const FX_TYPES = new Set(['alienHit', 'ufoHit', 'playerHit', 'bunkerHit', 'alienShotHit']);

const queue = createFxQueue<GameEvent>((e) => FX_TYPES.has(e.type));

/** Push destruction events for the scene to consume (survives React frame gaps). */
export function enqueueFx(events: GameEvent[]): void {
  queue.enqueue(events);
}

export function drainFxQueue(): GameEvent[] {
  return queue.drain();
}
