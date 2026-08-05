import { ALIEN_SHOT, FORMATION, PLAYER, TICK_DT, UFO } from '../game/constants';
import { activeBoard } from '../game/board';
import { logicalToWorld, SCALE_X, SCALE_Z } from '../../../arcade/space/logicalSpace';
import type { AlienShotType, GameState } from '../game/types';
import type { MotionBridge } from '../../../arcade/loop/contracts';
import {
  createMotionSnapshot,
  writeMotionSnapshot,
  type MotionPrevCapture,
  type MotionSnapshot,
  type Vec2,
} from './playerRender';

function activeShotWorld(state: GameState, type: AlienShotType): Vec2 | null {
  const slot = activeBoard(state).alienShots[type];
  if (slot.state !== 'active') return null;
  return logicalToWorld(
    slot.position.x + ALIEN_SHOT.hitboxHalfW,
    slot.position.y + ALIEN_SHOT.hitboxHalfH,
  );
}

function captureFromState(state: GameState): MotionPrevCapture {
  const board = activeBoard(state);
  return {
    playerX: board.player.x,
    ufoX: board.ufo?.x ?? null,
    bullet: board.playerBullet ? { x: board.playerBullet.x, z: board.playerBullet.z } : null,
    shots: {
      rolling: activeShotWorld(state, 'rolling'),
      plunger: activeShotWorld(state, 'plunger'),
      squiggly: activeShotWorld(state, 'squiggly'),
    },
    formationOriginX: board.formation.originX,
    formationOriginZ: board.formation.originZ,
  };
}

/** Invaders-owned motion bridge: SI pose bag stays out of the shared arcade loop. */
export function createInvadersMotionBridge(): MotionBridge<GameState, MotionSnapshot> & {
  /** Exposed for tests / debugging. */
  getPrev(): MotionPrevCapture;
} {
  let prev: MotionPrevCapture | null = null;

  return {
    createSnapshot(state) {
      const snap = createMotionSnapshot(activeBoard(state).player.x);
      prev = captureFromState(state);
      return snap;
    },
    capturePrev(state) {
      prev = captureFromState(state);
    },
    write(state, alpha, snapshot) {
      if (!prev) prev = captureFromState(state);
      const board = activeBoard(state);
      const shotFrames = {
        rolling: board.alienShots.rolling.animationFrame,
        plunger: board.alienShots.plunger.animationFrame,
        squiggly: board.alienShots.squiggly.animationFrame,
      };

      writeMotionSnapshot(snapshot, {
        alpha,
        prev,
        playerX: board.player.x,
        ufoX: board.ufo?.x ?? null,
        bullet: board.playerBullet ? { x: board.playerBullet.x, z: board.playerBullet.z } : null,
        shots: {
          rolling: activeShotWorld(state, 'rolling'),
          plunger: activeShotWorld(state, 'plunger'),
          squiggly: activeShotWorld(state, 'squiggly'),
        },
        shotFrames,
        ufoAnimFrame: board.ufo?.animFrame ?? 0,
        formationAnimFrame: board.formation.animFrame,
        formationOriginX: board.formation.originX,
        formationOriginZ: board.formation.originZ,
        phase: state.phase,
        playerMaxBlend: PLAYER.speed * TICK_DT * 1.5,
        ufoMaxBlend: UFO.speed * TICK_DT * 1.5,
        bulletMaxBlendX: PLAYER.speed * TICK_DT * 1.5,
        bulletMaxBlendZ: PLAYER.bulletSpeed * TICK_DT * 1.5,
        shotMaxBlendX: ALIEN_SHOT.acceleratedStepPixels * SCALE_X * 1.5,
        shotMaxBlendZ: ALIEN_SHOT.acceleratedStepPixels * SCALE_Z * 1.5,
        invasionMaxBlend: FORMATION.invasionFlySpeed * TICK_DT * 1.5,
      });
    },
    getPrev() {
      if (!prev) throw new Error('MotionBridge.prev not initialized');
      return prev;
    },
  };
}

export type { MotionSnapshot };
