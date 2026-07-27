import { describe, expect, it } from 'vitest';
import {
  blendDisplayX,
  blendOptionalVec2,
  blendUfoDisplayX,
  createMotionSnapshot,
  interpolatePlayerX,
  writeMotionSnapshot,
  type MotionPrevCapture,
} from './playerRender';

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

describe('blendDisplayX', () => {
  it('lerps when delta is within maxBlend', () => {
    expect(blendDisplayX(0, 0.2, 0.5, 0.3)).toBeCloseTo(0.1, 5);
  });

  it('snaps to current when delta exceeds maxBlend (teleport)', () => {
    expect(blendDisplayX(0, 5, 0.5, 0.3)).toBe(5);
  });
});

describe('blendUfoDisplayX', () => {
  it('hides when current UFO is null (despawn)', () => {
    expect(blendUfoDisplayX(1, null, 0.5, 0.2)).toEqual({
      visible: false,
      x: 1,
    });
  });

  it('snaps to current on spawn when prevTick was null', () => {
    expect(blendUfoDisplayX(null, -12, 0.5, 0.2)).toEqual({
      visible: true,
      x: -12,
    });
  });

  it('120Hz alternate frames yield even steps while UFO is present', () => {
    let simX = 0;
    let prevTick: number | null = 0;
    const drawn: number[] = [];
    prevTick = simX;
    simX += 0.2;
    drawn.push(blendUfoDisplayX(prevTick, simX, 0, 0.3).x);
    drawn.push(blendUfoDisplayX(prevTick, simX, 0.5, 0.3).x);
    prevTick = simX;
    simX += 0.2;
    drawn.push(blendUfoDisplayX(prevTick, simX, 0, 0.3).x);
    drawn.push(blendUfoDisplayX(prevTick, simX, 0.5, 0.3).x);
    expect(drawn[0]).toBeCloseTo(0.0, 5);
    expect(drawn[1]).toBeCloseTo(0.1, 5);
    expect(drawn[2]).toBeCloseTo(0.2, 5);
    expect(drawn[3]).toBeCloseTo(0.3, 5);
  });
});

describe('blendOptionalVec2', () => {
  it('hides on despawn but keeps last position (avoid origin flash)', () => {
    expect(blendOptionalVec2({ x: 1, z: 2 }, null, 0.5, 1, 1)).toEqual({
      visible: false,
      x: 1,
      z: 2,
    });
  });

  it('snaps on spawn when prev is null', () => {
    expect(blendOptionalVec2(null, { x: 3, z: 4 }, 0.5, 1, 1)).toEqual({
      visible: true,
      x: 3,
      z: 4,
    });
  });

  it('120Hz alternate frames yield even Z steps for a bullet', () => {
    let simZ = 0;
    let prev: { x: number; z: number } | null = { x: 0, z: 0 };
    const drawn: number[] = [];
    prev = { x: 0, z: simZ };
    simZ += 0.2;
    drawn.push(blendOptionalVec2(prev, { x: 0, z: simZ }, 0, 1, 0.3).z);
    drawn.push(blendOptionalVec2(prev, { x: 0, z: simZ }, 0.5, 1, 0.3).z);
    prev = { x: 0, z: simZ };
    simZ += 0.2;
    drawn.push(blendOptionalVec2(prev, { x: 0, z: simZ }, 0, 1, 0.3).z);
    drawn.push(blendOptionalVec2(prev, { x: 0, z: simZ }, 0.5, 1, 0.3).z);
    expect(drawn[0]).toBeCloseTo(0.0, 5);
    expect(drawn[1]).toBeCloseTo(0.1, 5);
    expect(drawn[2]).toBeCloseTo(0.2, 5);
    expect(drawn[3]).toBeCloseTo(0.3, 5);
  });
});

describe('writeMotionSnapshot invasion', () => {
  it('lerps formation originZ during invasion', () => {
    const snap = createMotionSnapshot();
    const prev: MotionPrevCapture = {
      playerX: 0,
      ufoX: null,
      bullet: null,
      shots: { rolling: null, plunger: null, squiggly: null },
      formationOriginX: 0,
      formationOriginZ: 5,
    };
    writeMotionSnapshot(snap, {
      alpha: 0.5,
      prev,
      playerX: 0,
      ufoX: null,
      bullet: null,
      shots: {
        rolling: null,
        plunger: null,
        squiggly: null,
      },
      shotFrames: { rolling: 0, plunger: 0, squiggly: 0 },
      formationOriginX: 0,
      formationOriginZ: 5.4,
      phase: 'invasion',
      playerMaxBlend: 1,
      ufoMaxBlend: 1,
      bulletMaxBlendX: 1,
      bulletMaxBlendZ: 1,
      shotMaxBlendX: 1,
      shotMaxBlendZ: 1,
      invasionMaxBlend: 1,
    });
    expect(snap.invasionSmooth).toBe(true);
    expect(snap.formationDispZ).toBeCloseTo(5.2, 5);
    expect(snap.formationSimZ).toBeCloseTo(5.4, 5);
  });

  it('does not smooth formation when not invading', () => {
    const snap = createMotionSnapshot();
    const prev: MotionPrevCapture = {
      playerX: 0,
      ufoX: null,
      bullet: null,
      shots: { rolling: null, plunger: null, squiggly: null },
      formationOriginX: 0,
      formationOriginZ: 5,
    };
    writeMotionSnapshot(snap, {
      alpha: 0.5,
      prev,
      playerX: 0,
      ufoX: null,
      bullet: null,
      shots: {
        rolling: null,
        plunger: null,
        squiggly: null,
      },
      shotFrames: { rolling: 0, plunger: 0, squiggly: 0 },
      formationOriginX: 0.4,
      formationOriginZ: 5,
      phase: 'playing',
      playerMaxBlend: 1,
      ufoMaxBlend: 1,
      bulletMaxBlendX: 1,
      bulletMaxBlendZ: 1,
      shotMaxBlendX: 1,
      shotMaxBlendZ: 1,
      invasionMaxBlend: 1,
    });
    expect(snap.invasionSmooth).toBe(false);
    expect(snap.formationDispX).toBe(0.4);
    expect(snap.formationDispZ).toBe(5);
    expect(snap.formationSimX).toBe(0.4);
    expect(snap.formationSimZ).toBe(5);
  });
});
