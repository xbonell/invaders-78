import { useEffect, useRef, useState } from 'react';
import { TICK_DT } from '../game/constants';
import { createGame, drainEvents, step, type Game } from '../game/simulation';
import { loadHighScore, saveHighScore } from '../game/storage';
import type { GameEvent, GameState } from '../game/types';
import { attachKeyboard } from '../input/keyboard';
import { pollGamepad } from '../input/gamepad';
import type { AudioEngine } from '../audio/engine';
import { enqueueFx } from '../scene/voxels/fxQueue';

export interface GameLoopApi {
  game: Game;
  state: GameState;
  version: number;
}

export function useGameLoop(audio: AudioEngine | null): GameLoopApi {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) {
    gameRef.current = createGame(loadHighScore());
  }
  const game = gameRef.current;

  const [version, setVersion] = useState(0);
  const padPrev = useRef({ fire: false, start: false, steering: false });
  const audioRef = useRef(audio);
  audioRef.current = audio;

  useEffect(() => {
    const unlock = () => audioRef.current?.unlock() ?? Promise.resolve();
    const detach = attachKeyboard(game, window, unlock);
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    let running = true;

    const frame = (now: number) => {
      if (!running) return;
      const raw = Math.min(0.05, (now - last) / 1000);
      last = now;

      pollGamepad(game, padPrev.current, unlock);

      const visible = document.visibilityState === 'visible';
      if (visible && game.state.phase !== 'paused') {
        acc += raw;
        while (acc >= TICK_DT) {
          step(game, TICK_DT);
          acc -= TICK_DT;
        }
      }

      const events = drainEvents(game);
      if (events.length) {
        enqueueFx(events);
        // Attract demo: FX yes, SFX only during real play
        if (
          game.state.phase === 'playing' ||
          game.state.phase === 'dying' ||
          game.state.phase === 'waveClear' ||
          game.state.phase === 'playerSwitch' ||
          game.state.phase === 'gameOver'
        ) {
          audioRef.current?.handleEvents(events);
        }
        maybePersistHi(game, events);
      }

      setVersion((v) => v + 1);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        audioRef.current?.suspend();
      } else {
        audioRef.current?.resume();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      detach();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [game]);

  return { game, state: game.state, version };
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
