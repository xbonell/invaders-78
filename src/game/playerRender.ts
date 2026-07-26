import type { AlienShotType, GamePhase } from './types';

/** Display-only linear interpolation between fixed simulation ticks. */
export function interpolatePlayerX(
  prevTickX: number,
  currentX: number,
  alpha: number,
): number {
  return prevTickX + (currentX - prevTickX) * alpha;
}

/** Lerp unless the jump looks like a teleport (respawn / reset). */
export function blendDisplayX(
  prevTickX: number,
  currentX: number,
  alpha: number,
  maxBlend: number,
): number {
  return Math.abs(currentX - prevTickX) > maxBlend
    ? currentX
    : interpolatePlayerX(prevTickX, currentX, alpha);
}

export interface UfoDisplayX {
  visible: boolean;
  x: number;
}

/**
 * Display UFO X: snap on spawn (prev null), hide on despawn (current null),
 * otherwise same lerp/snap rules as the player.
 */
export function blendUfoDisplayX(
  prevTickX: number | null,
  currentX: number | null,
  alpha: number,
  maxBlend: number,
): UfoDisplayX {
  if (currentX === null) return { visible: false, x: prevTickX ?? 0 };
  if (prevTickX === null) return { visible: true, x: currentX };
  return {
    visible: true,
    x: blendDisplayX(prevTickX, currentX, alpha, maxBlend),
  };
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface OptionalVec2Display {
  visible: boolean;
  x: number;
  z: number;
}

/** Optional entity (bullet / shot): snap spawn, hide despawn, else axis blends. */
export function blendOptionalVec2(
  prev: Vec2 | null,
  current: Vec2 | null,
  alpha: number,
  maxBlendX: number,
  maxBlendZ: number,
): OptionalVec2Display {
  if (current === null) {
    // Keep last coords so a still-mounted mesh does not jump to world origin.
    return { visible: false, x: prev?.x ?? 0, z: prev?.z ?? 0 };
  }
  if (prev === null) return { visible: true, x: current.x, z: current.z };
  return {
    visible: true,
    x: blendDisplayX(prev.x, current.x, alpha, maxBlendX),
    z: blendDisplayX(prev.z, current.z, alpha, maxBlendZ),
  };
}

export type ShotMotionSlot = OptionalVec2Display & { frame: number };

/** Mutable render snapshot written by the game loop, read by R3F useFrame. */
export interface MotionSnapshot {
  playerX: number;
  ufoVisible: boolean;
  ufoX: number;
  playerBulletVisible: boolean;
  playerBulletX: number;
  playerBulletZ: number;
  alienShots: Record<AlienShotType, ShotMotionSlot>;
  /** When true, apply formationDisp − formationSim as alien parent offset. */
  invasionSmooth: boolean;
  formationDispX: number;
  formationDispZ: number;
  formationSimX: number;
  formationSimZ: number;
}

const idleShot = (): ShotMotionSlot => ({
  visible: false,
  x: 0,
  z: 0,
  frame: 0,
});

export function createMotionSnapshot(playerX = 0): MotionSnapshot {
  return {
    playerX,
    ufoVisible: false,
    ufoX: 0,
    playerBulletVisible: false,
    playerBulletX: 0,
    playerBulletZ: 0,
    alienShots: {
      rolling: idleShot(),
      plunger: idleShot(),
      squiggly: idleShot(),
    },
    invasionSmooth: false,
    formationDispX: 0,
    formationDispZ: 0,
    formationSimX: 0,
    formationSimZ: 0,
  };
}

export interface MotionPrevCapture {
  playerX: number;
  ufoX: number | null;
  bullet: Vec2 | null;
  shots: Record<AlienShotType, Vec2 | null>;
  formationOriginX: number;
  formationOriginZ: number;
}

export interface WriteMotionSnapshotInput {
  alpha: number;
  prev: MotionPrevCapture;
  playerX: number;
  ufoX: number | null;
  bullet: Vec2 | null;
  shots: Record<AlienShotType, Vec2 | null>;
  shotFrames: Record<AlienShotType, number>;
  formationOriginX: number;
  formationOriginZ: number;
  phase: GamePhase;
  playerMaxBlend: number;
  ufoMaxBlend: number;
  bulletMaxBlendX: number;
  bulletMaxBlendZ: number;
  shotMaxBlendX: number;
  shotMaxBlendZ: number;
  invasionMaxBlend: number;
}

export function writeMotionSnapshot(
  snap: MotionSnapshot,
  input: WriteMotionSnapshotInput,
): void {
  const { alpha, prev } = input;

  snap.playerX = blendDisplayX(
    prev.playerX,
    input.playerX,
    alpha,
    input.playerMaxBlend,
  );

  const ufo = blendUfoDisplayX(
    prev.ufoX,
    input.ufoX,
    alpha,
    input.ufoMaxBlend,
  );
  snap.ufoVisible = ufo.visible;
  snap.ufoX = ufo.x;

  const bullet = blendOptionalVec2(
    prev.bullet,
    input.bullet,
    alpha,
    input.bulletMaxBlendX,
    input.bulletMaxBlendZ,
  );
  snap.playerBulletVisible = bullet.visible;
  snap.playerBulletX = bullet.x;
  snap.playerBulletZ = bullet.z;

  for (const type of ['rolling', 'plunger', 'squiggly'] as const) {
    const blended = blendOptionalVec2(
      prev.shots[type],
      input.shots[type],
      alpha,
      input.shotMaxBlendX,
      input.shotMaxBlendZ,
    );
    snap.alienShots[type] = {
      ...blended,
      frame: input.shotFrames[type],
    };
  }

  snap.formationSimX = input.formationOriginX;
  snap.formationSimZ = input.formationOriginZ;

  if (input.phase === 'invasion') {
    snap.invasionSmooth = true;
    snap.formationDispX = blendDisplayX(
      prev.formationOriginX,
      input.formationOriginX,
      alpha,
      input.invasionMaxBlend,
    );
    snap.formationDispZ = blendDisplayX(
      prev.formationOriginZ,
      input.formationOriginZ,
      alpha,
      input.invasionMaxBlend,
    );
  } else {
    snap.invasionSmooth = false;
    snap.formationDispX = input.formationOriginX;
    snap.formationDispZ = input.formationOriginZ;
  }
}
