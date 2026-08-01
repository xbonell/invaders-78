import { describe, expect, it, vi } from 'vitest';
import { retainBake, type BakeSlot } from './retainBake';

type Bake = { url: string; dispose: () => void };

describe('retainBake', () => {
  it('creates once and reuses — Strict Mode remount must not re-bake or orphan a blob', () => {
    const create = vi.fn<() => Bake>(() => ({
      url: 'blob:test',
      dispose: vi.fn<() => void>(),
    }));
    const slot: BakeSlot<Bake> = { current: null };

    const first = retainBake(slot, create);
    const second = retainBake(slot, create);

    expect(create).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(second.url).toBe('blob:test');
  });
});
