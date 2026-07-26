import { describe, expect, it } from 'vitest';
import { interpolatePlayerX } from './playerRender';

describe('interpolatePlayerX', () => {
  it('places ship halfway between ticks when alpha is 0.5', () => {
    expect(interpolatePlayerX(0, 0.2, 0.5)).toBeCloseTo(0.1, 5);
  });

  it('stays at prev tick when alpha is 0 (just after a tick drained acc)', () => {
    expect(interpolatePlayerX(0, 0.2, 0)).toBeCloseTo(0, 5);
  });

  it('reaches current when alpha is 1', () => {
    expect(interpolatePlayerX(0, 0.2, 1)).toBeCloseTo(0.2, 5);
  });

  it('120Hz alternate frames yield even 0.1 steps with correct prevTick semantics', () => {
    let simX = 0;
    let prevTick = 0;
    const drawn: number[] = [];
    prevTick = simX;
    simX += 0.2;
    drawn.push(interpolatePlayerX(prevTick, simX, 0));
    drawn.push(interpolatePlayerX(prevTick, simX, 0.5));
    prevTick = simX;
    simX += 0.2;
    drawn.push(interpolatePlayerX(prevTick, simX, 0));
    drawn.push(interpolatePlayerX(prevTick, simX, 0.5));
    expect(drawn[0]).toBeCloseTo(0.0, 5);
    expect(drawn[1]).toBeCloseTo(0.1, 5);
    expect(drawn[2]).toBeCloseTo(0.2, 5);
    expect(drawn[3]).toBeCloseTo(0.3, 5);
  });
});
