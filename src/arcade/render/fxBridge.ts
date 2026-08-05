/**
 * Generic destruction-event bridge: sim drains events → enqueue → scene drains.
 * Backends filter which event types spawn FX.
 */
export function createFxQueue<TEvent>(isFxEvent: (e: TEvent) => boolean) {
  const queue: TEvent[] = [];

  function enqueue(events: readonly TEvent[]): void {
    for (const e of events) {
      if (isFxEvent(e)) queue.push(e);
    }
  }

  function drain(): TEvent[] {
    if (queue.length === 0) return [];
    return queue.splice(0, queue.length);
  }

  return { enqueue, drain };
}
