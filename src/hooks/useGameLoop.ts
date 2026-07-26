import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { ALIEN_SHOT, FORMATION, PLAYER, TICK_DT, UFO } from '../game/constants';
import {
  createMotionSnapshot,
  writeMotionSnapshot,
  type MotionPrevCapture,
  type MotionSnapshot,
  type Vec2,
} from '../game/playerRender';
import { logicalToWorld, SCALE_X, SCALE_Z } from '../game/logicalSpace';
import { createGame, drainEvents, step, type Game } from '../game/simulation';
import { loadHighScore, saveHighScore } from '../game/storage';
import type { AlienShotType, GameEvent, GameState } from '../game/types';
import { visualSig } from '../game/visualSig';
import { attachKeyboard } from '../input/keyboard';
import { pollGamepad } from '../input/gamepad';
import type { AudioEngine } from '../audio/engine';
import { enqueueFx } from '../scene/voxels/fxQueue';

export interface GameLoopApi {
  game: Game;
  state: GameState;
  version: number;
  /** Display-only motion; scene applies via useFrame (sim remains authoritative). */
  motionSnapshot: MutableRefObject<MotionSnapshot>;
  /** Called from R3F useFrame so sim + display share one clock. */
  advanceRef: RefObject<(now: number) => void>;
}

function activeShotWorld(state: GameState, type: AlienShotType): Vec2 | null {
  const slot = state.alienShots[type];
  if (slot.state !== 'active') return null;
  return logicalToWorld(
    slot.position.x + ALIEN_SHOT.hitboxHalfW,
    slot.position.y + ALIEN_SHOT.hitboxHalfH,
  );
}

function capturePrev(state: GameState): MotionPrevCapture {
  return {
    playerX: state.player.x,
    ufoX: state.ufo?.x ?? null,
    bullet: state.playerBullet
      ? { x: state.playerBullet.x, z: state.playerBullet.z }
      : null,
    shots: {
      rolling: activeShotWorld(state, 'rolling'),
      plunger: activeShotWorld(state, 'plunger'),
      squiggly: activeShotWorld(state, 'squiggly'),
    },
    formationOriginX: state.formation.originX,
    formationOriginZ: state.formation.originZ,
  };
}

function emptyPrev(state: GameState): MotionPrevCapture {
  return {
    playerX: state.player.x,
    ufoX: state.ufo?.x ?? null,
    bullet: state.playerBullet
      ? { x: state.playerBullet.x, z: state.playerBullet.z }
      : null,
    shots: {
      rolling: activeShotWorld(state, 'rolling'),
      plunger: activeShotWorld(state, 'plunger'),
      squiggly: activeShotWorld(state, 'squiggly'),
    },
    formationOriginX: state.formation.originX,
    formationOriginZ: state.formation.originZ,
  };
}

export function useGameLoop(audio: AudioEngine | null): GameLoopApi {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) {
    gameRef.current = createGame(loadHighScore());
  }
  const game = gameRef.current;

  const [version, setVersion] = useState(0);
  const motionSnapshot = useRef<MotionSnapshot>(
    createMotionSnapshot(game.state.player.x),
  );
  const prevCapture = useRef<MotionPrevCapture>(emptyPrev(game.state));
  const lastVisualSig = useRef(visualSig(game.state));
  const padPrev = useRef({ fire: false, start: false, steering: false });
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const clockRef = useRef({ acc: 0, last: 0, primed: false });
  const advanceRef = useRef<(now: number) => void>(() => {});

  const bumpUi = () => setVersion((v) => v + 1);
  const bumpUiRef = useRef(bumpUi);
  bumpUiRef.current = bumpUi;

  advanceRef.current = (now: number) => {
    const clock = clockRef.current;
    if (!clock.primed) {
      clock.last = now;
      clock.primed = true;
    }

    const raw = Math.min(0.05, (now - clock.last) / 1000);
    clock.last = now;

    const unlock = () => audioRef.current?.unlock() ?? Promise.resolve();
    pollGamepad(game, padPrev.current, unlock);

    const visible = document.visibilityState === 'visible';
    if (visible && game.state.phase !== 'paused') {
      clock.acc += raw;
      while (clock.acc >= TICK_DT) {
        prevCapture.current = capturePrev(game.state);
        step(game, TICK_DT);
        clock.acc -= TICK_DT;
      }
    }

    const alpha = clock.acc / TICK_DT;
    const state = game.state;
    const shotFrames = {
      rolling: state.alienShots.rolling.animationFrame,
      plunger: state.alienShots.plunger.animationFrame,
      squiggly: state.alienShots.squiggly.animationFrame,
    };

    writeMotionSnapshot(motionSnapshot.current, {
      alpha,
      prev: prevCapture.current,
      playerX: state.player.x,
      ufoX: state.ufo?.x ?? null,
      bullet: state.playerBullet
        ? { x: state.playerBullet.x, z: state.playerBullet.z }
        : null,
      shots: {
        rolling: activeShotWorld(state, 'rolling'),
        plunger: activeShotWorld(state, 'plunger'),
        squiggly: activeShotWorld(state, 'squiggly'),
      },
      shotFrames,
      formationOriginX: state.formation.originX,
      formationOriginZ: state.formation.originZ,
      phase: state.phase,
      playerMaxBlend: PLAYER.speed * TICK_DT * 1.5,
      ufoMaxBlend: UFO.speed * TICK_DT * 1.5,
      bulletMaxBlendX: PLAYER.speed * TICK_DT * 1.5,
      bulletMaxBlendZ: PLAYER.bulletSpeed * TICK_DT * 1.5,
      shotMaxBlendX: ALIEN_SHOT.acceleratedStepPixels * SCALE_X * 1.5,
      shotMaxBlendZ: ALIEN_SHOT.acceleratedStepPixels * SCALE_Z * 1.5,
      invasionMaxBlend: FORMATION.invasionFlySpeed * TICK_DT * 1.5,
    });

    const events = drainEvents(game);
    if (events.length) {
      enqueueFx(events);
      if (
        game.state.phase === 'playing' ||
        game.state.phase === 'dying' ||
        game.state.phase === 'invasion' ||
        game.state.phase === 'waveClear' ||
        game.state.phase === 'playerSwitch' ||
        game.state.phase === 'gameOver'
      ) {
        audioRef.current?.handleEvents(events);
      }
      maybePersistHi(game, events);
    }

    // Reconcile React only for discrete visuals — never for continuous X motion.
    const sig = visualSig(game.state);
    if (events.length || sig !== lastVisualSig.current) {
      lastVisualSig.current = sig;
      bumpUiRef.current();
    }
  };

  useEffect(() => {
    const unlock = () => audioRef.current?.unlock() ?? Promise.resolve();
    const detach = attachKeyboard(game, window, unlock, () => bumpUiRef.current());

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        audioRef.current?.suspend();
        clockRef.current.primed = false;
      } else {
        audioRef.current?.resume();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      detach();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [game]);

  return { game, state: game.state, version, motionSnapshot, advanceRef };
}

function maybePersistHi(game: Game, events: GameEvent[]): void {
  if (
    events.some(
      (e) =>
        (e.type === 'alienHit' && e.points > 0) ||
        (e.type === 'ufoHit' && e.points > 0) ||
        e.type === 'gameOver',
    )
  ) {
    saveHighScore(game.state.highScore);
  }
}
