import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { ALIEN_SHOT, FORMATION, PLAYER, TICK_DT, UFO } from '../game/constants';
import {
  createMotionSnapshot,
  writeMotionSnapshot,
  type MotionPrevCapture,
  type MotionSnapshot,
  type Vec2,
} from '../game/playerRender';
import { logicalToWorld, SCALE_X, SCALE_Z } from '../game/logicalSpace';
import { activeBoard } from '../game/board';
import { createGame, drainEvents, step, type Game } from '../game/simulation';
import { loadHighScore, saveHighScore } from '../game/storage';
import type { AlienShotType, GameEvent, GameState } from '../game/types';
import { visualSig } from '../game/visualSig';
import type { PauseMenuInput } from '../app/pauseMenu';
import { attachKeyboard } from '../input/keyboard';
import { pollGamepad } from '../input/gamepad';
import type { AudioEngine } from '../audio/engine';
import { enqueueFx } from '../scene/voxels/fxQueue';
import { enqueueScoreFloats } from '../scene/voxels/scoreFloatQueue';
import {
  fetchGlobalHighScore,
  submitGlobalHighScore,
} from '../net/highScoreApi';
import { mergeHighScores, shouldSubmitHighScore } from '../net/highScorePolicy';

export interface GameLoopApi {
  game: Game;
  state: GameState;
  version: number;
  /** Display-only motion; scene applies via useFrame (sim remains authoritative). */
  motionSnapshot: MutableRefObject<MotionSnapshot>;
  /** Called from R3F useFrame so sim + display share one clock. */
  advanceRef: RefObject<(now: number) => void>;
}

export type PauseMenuInputRef = MutableRefObject<PauseMenuInput | null>;

function activeShotWorld(state: GameState, type: AlienShotType): Vec2 | null {
  const slot = activeBoard(state).alienShots[type];
  if (slot.state !== 'active') return null;
  return logicalToWorld(
    slot.position.x + ALIEN_SHOT.hitboxHalfW,
    slot.position.y + ALIEN_SHOT.hitboxHalfH,
  );
}

function capturePrev(state: GameState): MotionPrevCapture {
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

function emptyPrev(state: GameState): MotionPrevCapture {
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

export function useGameLoop(
  audio: AudioEngine | null,
  pauseMenuRef?: PauseMenuInputRef,
): GameLoopApi {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) {
    gameRef.current = createGame(loadHighScore());
  }
  const game = gameRef.current;
  const knownGlobalRef = useRef<number | null>(null);

  const [version, setVersion] = useState(0);
  const motionSnapshot = useRef(createMotionSnapshot(activeBoard(game.state).player.x));
  const prevCapture = useRef<MotionPrevCapture>(emptyPrev(game.state));
  const lastVisualSig = useRef(visualSig(game.state));
  const padPrev = useRef({
    fire: false,
    start: false,
    select: false,
    steering: false,
    left: false,
    right: false,
    up: false,
    down: false,
    ignoreFireUntilRelease: false,
  });
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const pauseMenuRefHold = useRef(pauseMenuRef);
  pauseMenuRefHold.current = pauseMenuRef;
  const pauseBridge = useRef<PauseMenuInput>({
    navigate: (dir) => pauseMenuRefHold.current?.current?.navigate(dir),
    confirm: () => pauseMenuRefHold.current?.current?.confirm(),
  }).current;

  const clockRef = useRef({ acc: 0, last: 0, primed: false });
  const advanceRef = useRef<(now: number) => void>(() => {});

  const bumpUi = () => setVersion((v) => v + 1);
  const bumpUiRef = useRef(bumpUi);
  bumpUiRef.current = bumpUi;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const remote = await fetchGlobalHighScore();
      if (cancelled) return;
      knownGlobalRef.current = remote;
      const merged = mergeHighScores(game.state.highScore, remote);
      if (merged !== game.state.highScore) {
        game.state.highScore = merged;
        saveHighScore(merged);
        bumpUiRef.current();
      } else if (remote != null && shouldSubmitHighScore(game.state.highScore, remote)) {
        const stored = await submitGlobalHighScore(game.state.highScore);
        if (!cancelled && stored != null) knownGlobalRef.current = stored;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [game]);

  advanceRef.current = (now: number) => {
    const clock = clockRef.current;
    if (!clock.primed) {
      clock.last = now;
      clock.primed = true;
    }

    const raw = Math.min(0.05, (now - clock.last) / 1000);
    clock.last = now;

    const unlock = () => audioRef.current?.unlock() ?? Promise.resolve();
    pollGamepad(game, padPrev.current, unlock, pauseBridge);

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
    const board = activeBoard(state);
    const shotFrames = {
      rolling: board.alienShots.rolling.animationFrame,
      plunger: board.alienShots.plunger.animationFrame,
      squiggly: board.alienShots.squiggly.animationFrame,
    };

    writeMotionSnapshot(motionSnapshot.current, {
      alpha,
      prev: prevCapture.current,
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

    const events = drainEvents(game);
    if (events.length) {
      enqueueFx(events);
      enqueueScoreFloats(
        events
          .filter((e): e is Extract<GameEvent, { type: 'ufoHit' }> => e.type === 'ufoHit')
          .map((e) => ({ points: e.points, x: e.x, z: e.z })),
      );
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
      maybePersistHi(game, events, knownGlobalRef);
    }

    // Reconcile React only when the discrete visual fingerprint changes.
    // Do not bump on events alone — formationStep is audio-only and was
    // remounting the whole Playfield every march.
    const sig = visualSig(game.state);
    if (sig !== lastVisualSig.current) {
      lastVisualSig.current = sig;
      bumpUiRef.current();
    }
  };

  useEffect(() => {
    const unlock = () => audioRef.current?.unlock() ?? Promise.resolve();
    const detach = attachKeyboard(game, window, unlock, () => bumpUiRef.current(), pauseBridge);

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
  }, [game, pauseBridge]);

  return { game, state: game.state, version, motionSnapshot, advanceRef };
}

function maybePersistHi(
  game: Game,
  events: GameEvent[],
  knownGlobalRef: { current: number | null },
): void {
  if (
    !events.some(
      (e) =>
        (e.type === 'alienHit' && e.points > 0) ||
        (e.type === 'ufoHit' && e.points > 0) ||
        e.type === 'gameOver',
    )
  ) {
    return;
  }

  saveHighScore(game.state.highScore);

  if (!shouldSubmitHighScore(game.state.highScore, knownGlobalRef.current)) return;

  const score = game.state.highScore;
  void submitGlobalHighScore(score).then((stored) => {
    if (stored != null) knownGlobalRef.current = stored;
  });
}
