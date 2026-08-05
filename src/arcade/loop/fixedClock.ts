/** Fixed-timestep accumulator shared by arcade game loops. */

export interface FixedClock {
  acc: number;
  last: number;
  primed: boolean;
}

export function createFixedClock(): FixedClock {
  return { acc: 0, last: 0, primed: false };
}

/**
 * Advance wall-clock into the accumulator. Returns raw dt (seconds, capped)
 * and whether the clock was just primed (skip work on first frame).
 */
export function tickFixedClock(
  clock: FixedClock,
  nowMs: number,
  maxDt = 0.05,
): { rawDt: number; justPrimed: boolean } {
  if (!clock.primed) {
    clock.last = nowMs;
    clock.primed = true;
    return { rawDt: 0, justPrimed: true };
  }
  const rawDt = Math.min(maxDt, (nowMs - clock.last) / 1000);
  clock.last = nowMs;
  return { rawDt, justPrimed: false };
}

export function resetFixedClock(clock: FixedClock): void {
  clock.primed = false;
}
