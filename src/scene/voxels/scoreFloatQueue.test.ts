import { describe, expect, it } from 'vitest';
import { drainScoreFloatQueue, enqueueScoreFloats } from './scoreFloatQueue';

describe('scoreFloatQueue', () => {
  it('enqueues only positive-point spawns and drains them', () => {
    enqueueScoreFloats([
      { points: 0, x: 1, z: 2 },
      { points: 300, x: 3, z: 4 },
      { points: 50, x: -1, z: 0 },
    ]);
    expect(drainScoreFloatQueue()).toEqual([
      { points: 300, x: 3, z: 4 },
      { points: 50, x: -1, z: 0 },
    ]);
    expect(drainScoreFloatQueue()).toEqual([]);
  });
});
