import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { createFixedClock, resetFixedClock, tickFixedClock, TICK_DT } from '../../../arcade/loop';
import { loadHighScore, saveHighScore } from '../../../arcade/storage/storage';
import { fetchGlobalHighScore, submitGlobalHighScore } from '../../../arcade/net/highScoreApi';
import { mergeHighScores, shouldSubmitHighScore } from '../../../arcade/net/highScorePolicy';
import type { PauseMenuInput } from '../../../shell/chrome/pauseMenu';
import { attachKeyboard } from '../../../shell/input/keyboard';
import { createGamepadPrev, pollGamepad } from '../../../shell/input/gamepad';
import { createGame, drainEvents, step, type Game } from '../game/simulation';
import type { GameEvent, GameState } from '../game/types';
import { visualSig } from '../game/visualSig';
import type { AudioEngine } from '../audio/engine';
import { createInvadersMotionBridge, type MotionSnapshot } from '../motion/motionBridge';
import { enqueueFx } from '../render/voxel/fxQueue';
import { enqueueScoreFloats } from '../render/voxel/scoreFloatQueue';

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

/**
 * Invaders game loop: shared fixed clock + SI MotionBridge + event sinks.
 * Does not import formation/UFO/shot tuning — that lives in the motion bridge.
 */
export function useInvadersGameLoop(
  audio: AudioEngine | null,
  pauseMenuRef?: PauseMenuInputRef,
): GameLoopApi {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) {
    gameRef.current = createGame(loadHighScore());
  }
  const game = gameRef.current;
  const knownGlobalRef = useRef<number | null>(null);

  const motionBridge = useRef(createInvadersMotionBridge()).current;
  const [version, setVersion] = useState(0);
  const motionSnapshot = useRef(motionBridge.createSnapshot(game.state));
  const lastVisualSig = useRef(visualSig(game.state));
  const padPrev = useRef(createGamepadPrev());
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const pauseMenuRefHold = useRef(pauseMenuRef);
  pauseMenuRefHold.current = pauseMenuRef;
  const pauseBridge = useRef<PauseMenuInput>({
    navigate: (dir) => pauseMenuRefHold.current?.current?.navigate(dir),
    confirm: () => pauseMenuRefHold.current?.current?.confirm(),
  }).current;

  const clockRef = useRef(createFixedClock());
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
    const { rawDt } = tickFixedClock(clock, now);

    const unlock = () => audioRef.current?.unlock() ?? Promise.resolve();
    pollGamepad(game, padPrev.current, unlock, pauseBridge);

    const visible = document.visibilityState === 'visible';
    if (visible && game.state.phase !== 'paused') {
      clock.acc += rawDt;
      while (clock.acc >= TICK_DT) {
        motionBridge.capturePrev(game.state);
        step(game, TICK_DT);
        clock.acc -= TICK_DT;
      }
    }

    const alpha = clock.acc / TICK_DT;
    motionBridge.write(game.state, alpha, motionSnapshot.current);

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
    const detach = attachKeyboard(game, document, unlock, () => bumpUiRef.current(), pauseBridge);

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        audioRef.current?.suspend();
        resetFixedClock(clockRef.current);
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

/** @deprecated Use useInvadersGameLoop */
export const useGameLoop = useInvadersGameLoop;
