/** Arcade-authentic alien Rolling / Plunger / Squiggly shot system. */

import { ALIEN_SHOT, FORMATION, HIT, PLAYER } from './constants';
import {
  aabbOverlap,
  erodeBunkerAt,
} from './collisions';
import { aliveCount, alienWorldPos } from './formation';
import {
  LOGICAL_W,
  logicalToWorld,
  worldDeltaYToLogical,
  worldToLogical,
} from './logicalSpace';
import type {
  Alien,
  AlienShotSlot,
  AlienShotSystem,
  AlienShotType,
  Bullet,
  Bunker,
  FormationState,
  GameState,
} from './types';

export const COLUMN_FIRE_TABLE = [
  1, 7, 1, 1, 1, 4, 11, 1, 6, 3, 1, 1, 11, 9, 2, 8, 2, 11, 4, 7, 10,
] as const;

export const PLUNGER_TABLE_START = 0;
export const PLUNGER_TABLE_END = 15;
export const SQUIGGLY_TABLE_START = 6;
export const SQUIGGLY_TABLE_END = 20;

export type SpawnBlockReason =
  | 'slot-not-idle'
  | 'reload-threshold'
  | 'type-disabled'
  | 'ufo-slot-lock'
  | 'no-living-alien';

export type AlienShotDebugEvent =
  | { type: 'spawn-attempt'; shotType: AlienShotType }
  | { type: 'spawn-blocked'; reason: SpawnBlockReason; shotType: AlienShotType }
  | { type: 'spawned'; shotType: AlienShotType; column: number }
  | { type: 'moved'; shotType: AlienShotType; y: number }
  | { type: 'collision'; shotType: AlienShotType; target: string }
  | { type: 'despawned'; shotType: AlienShotType };

export interface AlienShotContext {
  playerScore: number;
  remainingAlienCount: number;
  playerCenterX: number;
  aliens: Alien[];
  formation: FormationState;
  bunkers: Bunker[];
  playerBullet: Bullet | null;
  clearPlayerBullet: () => void;
  player: { x: number; z: number; alive: boolean };
  onPlayerHit: () => void;
  onBunkerHit: (x: number, z: number) => void;
  onAlienShotExplode: (x: number, z: number) => void;
  squigglySlotLockedByUfo: boolean;
  debugEvents?: AlienShotDebugEvent[];
}

function idleSlot(type: AlienShotType): AlienShotSlot {
  return {
    type,
    state: 'idle',
    position: { x: 0, y: 0 },
    previousPosition: { x: 0, y: 0 },
    moveCounter: ALIEN_SHOT.inactiveMoveCounter,
    animationFrame: 0,
    explosionFramesRemaining: 0,
    sourceColumn: null,
    sourceAlienId: null,
  };
}

export function createAlienShotSystem(): AlienShotSystem {
  return {
    rolling: idleSlot('rolling'),
    plunger: idleSlot('plunger'),
    squiggly: idleSlot('squiggly'),
    nextSlotToProcess: 0,
    plungerTableIndex: PLUNGER_TABLE_START,
    squigglyTableIndex: SQUIGGLY_TABLE_START,
    squigglySlotLockedByUfo: false,
  };
}

export function resetShotToIdle(slot: AlienShotSlot): void {
  slot.state = 'idle';
  slot.position = { x: 0, y: 0 };
  slot.previousPosition = { x: 0, y: 0 };
  slot.moveCounter = ALIEN_SHOT.inactiveMoveCounter;
  slot.animationFrame = 0;
  slot.explosionFramesRemaining = 0;
  slot.sourceColumn = null;
  slot.sourceAlienId = null;
}

export function clearAlienShots(system: AlienShotSystem): void {
  resetShotToIdle(system.rolling);
  resetShotToIdle(system.plunger);
  resetShotToIdle(system.squiggly);
  system.squigglySlotLockedByUfo = false;
}

export function resetAlienShotSystemForWave(system: AlienShotSystem): void {
  clearAlienShots(system);
  system.nextSlotToProcess = 0;
  if (ALIEN_SHOT.resetFiringPatternsEachWave) {
    system.plungerTableIndex = PLUNGER_TABLE_START;
    system.squigglyTableIndex = SQUIGGLY_TABLE_START;
  }
}

export function getAlienShotReloadThreshold(score: number): number {
  if (score < 200) return 0x30;
  if (score < 1000) return 0x10;
  if (score < 2000) return 0x0b;
  if (score < 3000) return 0x08;
  return 0x07;
}

export function allAlienShotSlots(
  system: AlienShotSystem,
): readonly AlienShotSlot[] {
  return [system.rolling, system.plunger, system.squiggly];
}

export function getSlotByIndex(
  system: AlienShotSystem,
  index: 0 | 1 | 2,
): AlienShotSlot {
  if (index === 0) return system.rolling;
  if (index === 1) return system.plunger;
  return system.squiggly;
}

function pushDebug(
  ctx: AlienShotContext,
  event: AlienShotDebugEvent,
): void {
  ctx.debugEvents?.push(event);
}

export function reloadAllowsShot(
  candidate: AlienShotSlot,
  allSlots: readonly AlienShotSlot[],
  reloadThreshold: number,
): boolean {
  const otherCounters = allSlots
    .filter((slot) => slot.type !== candidate.type)
    .map((slot) =>
      slot.state === 'idle'
        ? ALIEN_SHOT.inactiveMoveCounter
        : slot.moveCounter,
    );
  return Math.min(...otherCounters) >= reloadThreshold;
}

export function isShotTypeEligible(
  type: AlienShotType,
  remainingAlienCount: number,
  squigglySlotLockedByUfo: boolean,
): boolean {
  switch (type) {
    case 'rolling':
      return remainingAlienCount >= 1;
    case 'plunger':
      return remainingAlienCount > 1;
    case 'squiggly':
      return remainingAlienCount >= 1 && !squigglySlotLockedByUfo;
  }
}

export function getLowestLivingAlienInColumn(
  aliens: Alien[],
  column: number,
): Alien | null {
  let best: Alien | null = null;
  for (const a of aliens) {
    if (!a.alive || a.col !== column) continue;
    if (!best || a.row > best.row) best = a;
  }
  return best;
}

export function findShooterFromRequestedColumn(
  aliens: Alien[],
  requestedColumn: number,
): Alien | null {
  for (let offset = 0; offset < FORMATION.cols; offset += 1) {
    const column = (requestedColumn + offset) % FORMATION.cols;
    const alien = getLowestLivingAlienInColumn(aliens, column);
    if (alien !== null) return alien;
  }
  return null;
}

/** Occupied column centres in the same space as playerCenterX (world X). */
export function selectRollingShotColumn(
  playerCenterX: number,
  aliens: Alien[],
  formation: FormationState,
): number | null {
  const occupied = new Map<number, number>();
  for (const a of aliens) {
    if (!a.alive) continue;
    if (!occupied.has(a.col)) {
      const p = alienWorldPos(a, formation);
      occupied.set(a.col, p.x);
    }
  }
  if (occupied.size === 0) return null;

  let bestCol = -1;
  let bestDist = Infinity;
  for (const [col, cx] of [...occupied.entries()].sort((a, b) => a[0] - b[0])) {
    const d = Math.abs(cx - playerCenterX);
    if (d < bestDist) {
      bestDist = d;
      bestCol = col;
    }
  }
  return bestCol;
}

/** Test helper: select among explicit column centres (logical or world units). */
export function selectRollingShotColumnFromCentres(
  playerCenterX: number,
  columnCentres: ReadonlyArray<{ column: number; centerX: number }>,
): number {
  let bestCol = columnCentres[0]!.column;
  let bestDist = Infinity;
  const sorted = [...columnCentres].sort((a, b) => a.column - b.column);
  for (const { column, centerX } of sorted) {
    const d = Math.abs(centerX - playerCenterX);
    if (d < bestDist) {
      bestDist = d;
      bestCol = column;
    }
  }
  return bestCol;
}

function advancePlungerPointer(system: AlienShotSystem): void {
  system.plungerTableIndex += 1;
  if (system.plungerTableIndex > PLUNGER_TABLE_END) {
    system.plungerTableIndex = PLUNGER_TABLE_START;
  }
}

function advanceSquigglyPointer(system: AlienShotSystem): void {
  system.squigglyTableIndex += 1;
  if (system.squigglyTableIndex > SQUIGGLY_TABLE_END) {
    system.squigglyTableIndex = SQUIGGLY_TABLE_START;
  }
}

export function peekPlungerColumn(system: AlienShotSystem): number {
  return COLUMN_FIRE_TABLE[system.plungerTableIndex]! - 1;
}

export function peekSquigglyColumn(system: AlienShotSystem): number {
  return COLUMN_FIRE_TABLE[system.squigglyTableIndex]! - 1;
}

function selectShooter(
  type: AlienShotType,
  system: AlienShotSystem,
  ctx: AlienShotContext,
): Alien | null {
  if (type === 'rolling') {
    const col = selectRollingShotColumn(
      ctx.playerCenterX,
      ctx.aliens,
      ctx.formation,
    );
    if (col === null) return null;
    return getLowestLivingAlienInColumn(ctx.aliens, col);
  }
  const requested =
    type === 'plunger' ? peekPlungerColumn(system) : peekSquigglyColumn(system);
  return findShooterFromRequestedColumn(ctx.aliens, requested);
}

function calculateShotSpawnPosition(
  shooter: Alien,
  formation: FormationState,
): { x: number; y: number } {
  const wp = alienWorldPos(shooter, formation);
  const logical = worldToLogical(wp.x, wp.z);
  const alienHalfH = worldDeltaYToLogical(HIT.alienHalfD);
  const shotHalfW = ALIEN_SHOT.hitboxHalfW;
  const spawnY =
    Math.floor(logical.y + alienHalfH) + ALIEN_SHOT.projectileSpawnGap;
  const spawnX = Math.floor(logical.x - shotHalfW);
  return {
    x: Math.max(0, Math.min(LOGICAL_W - 1, spawnX)),
    y: Math.max(0, spawnY),
  };
}

export function activateShot(
  slot: AlienShotSlot,
  shooter: Alien,
  formation: FormationState,
): void {
  const pos = calculateShotSpawnPosition(shooter, formation);
  slot.state = 'active';
  slot.position = { ...pos };
  slot.previousPosition = { ...pos };
  slot.moveCounter = 0;
  slot.animationFrame = 0;
  slot.explosionFramesRemaining = 0;
  slot.sourceAlienId = shooter.id;
  slot.sourceColumn = shooter.col;
}

/** Force-activate a slot at a logical position (tests / death-hit injection). */
export function forceActivateShot(
  slot: AlienShotSlot,
  x: number,
  y: number,
): void {
  slot.state = 'active';
  slot.position = { x, y };
  slot.previousPosition = { x, y };
  slot.moveCounter = 0;
  slot.animationFrame = 0;
  slot.explosionFramesRemaining = 0;
}

export function beginAlienShotExplosion(
  slot: AlienShotSlot,
  ctx?: AlienShotContext,
): void {
  if (slot.state === 'exploding') return;
  slot.state = 'exploding';
  slot.explosionFramesRemaining = ALIEN_SHOT.explosionFrames;
  if (ctx) {
    const w = logicalToWorld(
      slot.position.x + ALIEN_SHOT.hitboxHalfW,
      slot.position.y + ALIEN_SHOT.hitboxHalfH,
    );
    ctx.onAlienShotExplode(w.x, w.z);
  }
}

function attemptSpawn(
  slot: AlienShotSlot,
  system: AlienShotSystem,
  ctx: AlienShotContext,
): boolean {
  pushDebug(ctx, { type: 'spawn-attempt', shotType: slot.type });

  if (slot.state !== 'idle') {
    pushDebug(ctx, {
      type: 'spawn-blocked',
      reason: 'slot-not-idle',
      shotType: slot.type,
    });
    return false;
  }

  if (
    !isShotTypeEligible(
      slot.type,
      ctx.remainingAlienCount,
      ctx.squigglySlotLockedByUfo,
    )
  ) {
    const reason: SpawnBlockReason =
      slot.type === 'squiggly' && ctx.squigglySlotLockedByUfo
        ? 'ufo-slot-lock'
        : 'type-disabled';
    pushDebug(ctx, { type: 'spawn-blocked', reason, shotType: slot.type });
    return false;
  }

  const threshold = getAlienShotReloadThreshold(ctx.playerScore);
  if (!reloadAllowsShot(slot, allAlienShotSlots(system), threshold)) {
    pushDebug(ctx, {
      type: 'spawn-blocked',
      reason: 'reload-threshold',
      shotType: slot.type,
    });
    return false;
  }

  const shooter = selectShooter(slot.type, system, ctx);
  if (shooter === null) {
    pushDebug(ctx, {
      type: 'spawn-blocked',
      reason: 'no-living-alien',
      shotType: slot.type,
    });
    return false;
  }

  activateShot(slot, shooter, ctx.formation);

  if (slot.type === 'plunger') advancePlungerPointer(system);
  if (slot.type === 'squiggly') advanceSquigglyPointer(system);

  pushDebug(ctx, {
    type: 'spawned',
    shotType: slot.type,
    column: shooter.col,
  });
  return true;
}

function stepPixels(remainingAlienCount: number): number {
  return remainingAlienCount <= ALIEN_SHOT.acceleratedAlienCountThreshold
    ? ALIEN_SHOT.acceleratedStepPixels
    : ALIEN_SHOT.normalStepPixels;
}

function shotWorldBullet(slot: AlienShotSlot, y: number): Bullet {
  const w = logicalToWorld(slot.position.x + ALIEN_SHOT.hitboxHalfW, y);
  return {
    x: w.x,
    z: w.z,
    vz: 0,
    fromPlayer: false,
  };
}

function overlapsPlayerBullet(
  slot: AlienShotSlot,
  testY: number,
  playerBullet: Bullet,
): boolean {
  const sample = shotWorldBullet(slot, testY);
  return aabbOverlap(
    sample.x,
    sample.z,
    HIT.bulletHalfW,
    HIT.bulletHalfD,
    playerBullet.x,
    playerBullet.z,
    HIT.bulletHalfW,
    HIT.bulletHalfD,
  );
}

function overlapsPlayer(
  slot: AlienShotSlot,
  testY: number,
  player: { x: number; z: number },
): boolean {
  const sample = shotWorldBullet(slot, testY);
  return aabbOverlap(
    sample.x,
    sample.z,
    HIT.bulletHalfW,
    HIT.bulletHalfD,
    player.x,
    player.z,
    PLAYER.halfWidth,
    PLAYER.halfDepth,
  );
}

function resolveSweptCollisions(
  slot: AlienShotSlot,
  ctx: AlienShotContext,
): boolean {
  const prevY = slot.previousPosition.y;
  const currY = slot.position.y;
  const startY = prevY + 1;
  const endY = currY;

  for (let testY = startY; testY <= endY; testY += 1) {
    if (ctx.playerBullet) {
      if (overlapsPlayerBullet(slot, testY, ctx.playerBullet)) {
        ctx.clearPlayerBullet();
        beginAlienShotExplosion(slot, ctx);
        pushDebug(ctx, {
          type: 'collision',
          shotType: slot.type,
          target: 'player-bullet',
        });
        return true;
      }
    }

    const sample = shotWorldBullet(slot, testY);
    for (const bunker of ctx.bunkers) {
      if (erodeBunkerAt(bunker, sample)) {
        ctx.onBunkerHit(sample.x, sample.z);
        beginAlienShotExplosion(slot, ctx);
        pushDebug(ctx, {
          type: 'collision',
          shotType: slot.type,
          target: 'bunker',
        });
        return true;
      }
    }

    if (ctx.player.alive && overlapsPlayer(slot, testY, ctx.player)) {
      beginAlienShotExplosion(slot, ctx);
      pushDebug(ctx, {
        type: 'collision',
        shotType: slot.type,
        target: 'player',
      });
      ctx.onPlayerHit();
      return true;
    }
  }

  if (slot.position.y >= ALIEN_SHOT.projectileBottomBoundary) {
    beginAlienShotExplosion(slot, ctx);
    pushDebug(ctx, {
      type: 'collision',
      shotType: slot.type,
      target: 'bottom',
    });
    return true;
  }

  return false;
}

function advanceAnimation(slot: AlienShotSlot): void {
  slot.animationFrame = (slot.animationFrame + 1) % 4;
}

export function updateActiveAlienShot(
  slot: AlienShotSlot,
  ctx: AlienShotContext,
): void {
  slot.previousPosition = { ...slot.position };
  const deltaY = stepPixels(ctx.remainingAlienCount);
  slot.position.y += deltaY;
  slot.moveCounter += 1;
  advanceAnimation(slot);
  pushDebug(ctx, { type: 'moved', shotType: slot.type, y: slot.position.y });
  resolveSweptCollisions(slot, ctx);
}

function updateAlienShotExplosion(
  slot: AlienShotSlot,
  ctx: AlienShotContext,
): void {
  slot.explosionFramesRemaining -= 1;
  if (slot.explosionFramesRemaining <= 0) {
    pushDebug(ctx, { type: 'despawned', shotType: slot.type });
    resetShotToIdle(slot);
  }
}

export function processAlienShotSlot(
  slot: AlienShotSlot,
  system: AlienShotSystem,
  ctx: AlienShotContext,
): void {
  switch (slot.state) {
    case 'idle':
      attemptSpawn(slot, system, ctx);
      break;
    case 'active':
      updateActiveAlienShot(slot, ctx);
      break;
    case 'exploding':
      updateAlienShotExplosion(slot, ctx);
      break;
  }
}

export function updateAlienShots(
  system: AlienShotSystem,
  ctx: AlienShotContext,
): void {
  const slot = getSlotByIndex(system, system.nextSlotToProcess);
  processAlienShotSlot(slot, system, ctx);
  system.nextSlotToProcess = ((system.nextSlotToProcess + 1) % 3) as 0 | 1 | 2;
}

export interface AlienShotSerializableState {
  slots: Array<{
    type: AlienShotType;
    state: AlienShotSlot['state'];
    position: { x: number; y: number };
    moveCounter: number;
    animationFrame: number;
    explosionFramesRemaining: number;
    sourceColumn: number | null;
  }>;
  nextSlotToProcess: number;
  plungerTableIndex: number;
  squigglyTableIndex: number;
  squigglySlotLockedByUfo: boolean;
}

export function serializeAlienShots(
  system: AlienShotSystem,
): AlienShotSerializableState {
  return {
    slots: allAlienShotSlots(system).map((s) => ({
      type: s.type,
      state: s.state,
      position: { ...s.position },
      moveCounter: s.moveCounter,
      animationFrame: s.animationFrame,
      explosionFramesRemaining: s.explosionFramesRemaining,
      sourceColumn: s.sourceColumn,
    })),
    nextSlotToProcess: system.nextSlotToProcess,
    plungerTableIndex: system.plungerTableIndex,
    squigglyTableIndex: system.squigglyTableIndex,
    squigglySlotLockedByUfo: system.squigglySlotLockedByUfo,
  };
}

/** Build context from live game state; `onPlayerHit` supplied by simulation. */
export function alienShotContextFromGameState(
  state: GameState,
  onPlayerHit: () => void,
  debugEvents?: AlienShotDebugEvent[],
  onClearPlayerBullet?: () => void,
): AlienShotContext {
  return {
    playerScore: state.score,
    remainingAlienCount: aliveCount(state.aliens),
    playerCenterX: state.player.x,
    aliens: state.aliens,
    formation: state.formation,
    bunkers: state.bunkers,
    playerBullet: state.playerBullet,
    clearPlayerBullet: () => {
      if (onClearPlayerBullet) onClearPlayerBullet();
      else state.playerBullet = null;
    },
    player: state.player,
    onPlayerHit,
    onBunkerHit: (x, z) => {
      state.events.push({ type: 'bunkerHit', x, z });
    },
    onAlienShotExplode: (x, z) => {
      state.events.push({ type: 'alienShotHit', x, z });
    },
    squigglySlotLockedByUfo: state.alienShots.squigglySlotLockedByUfo,
    debugEvents,
  };
}

/** Place an active rolling shot just above the player so the next process sweep hits. */
export function injectAlienShotAtPlayer(state: GameState): void {
  const logical = worldToLogical(state.player.x, state.player.z);
  // One normal step is 4px; start above so sweep covers player centre.
  forceActivateShot(
    state.alienShots.rolling,
    logical.x,
    Math.max(0, logical.y - 3),
  );
  state.alienShots.nextSlotToProcess = 0;
}
