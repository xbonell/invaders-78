import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from '../audio/engine';
import { playViewAspect, playViewInsetXPercent, playViewInsetYPercent } from '../game/playView';
import { dispatch } from '../game/simulation';
import { loadMute, saveMute } from '../game/storage';
import { useGameLoop } from '../hooks/useGameLoop';
import { applyBackdropUrl, bakeBackdrop } from '../scene/backdrop/bakeBackdrop';
import { GameCanvas } from '../scene/GameCanvas';
import { attachFullscreenListeners, subscribeFullscreen, toggleFullscreen } from './fullscreen';
import { FooterBar, Hud, Overlay } from './Hud';
import { CHROME_REF_WIDTH_PX } from './chromeScale';
import { movePauseIndex, PAUSE_DEFAULT_INDEX, pauseItemAt, type PauseMenuInput } from './pauseMenu';
import './app.css';

export default function App() {
  const audio = useMemo(() => new AudioEngine(), []);
  const [muted, setMuted] = useState(() => loadMute());
  const [fullscreen, setFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  );
  const [pauseIndex, setPauseIndex] = useState(PAUSE_DEFAULT_INDEX);
  const pauseMenuRef = useRef<PauseMenuInput | null>(null);
  const pauseIndexRef = useRef(pauseIndex);
  pauseIndexRef.current = pauseIndex;
  const shellRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { game, state, version, motionSnapshot, advanceRef } = useGameLoop(audio, pauseMenuRef);
  const wasPaused = useRef(false);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    const baked = bakeBackdrop();
    applyBackdropUrl(shell, baked.url);
    return () => baked.dispose();
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--stage-aspect', String(playViewAspect()));

    const stage = stageRef.current;
    if (!stage) return undefined;

    const syncStageWidth = () => {
      const width = stage.getBoundingClientRect().width;
      root.style.setProperty('--stage-w', `${width}px`);
      root.style.setProperty('--chrome-scale', String(width / CHROME_REF_WIDTH_PX));
    };
    syncStageWidth();
    const ro = new ResizeObserver(syncStageWidth);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    audio.setMuted(muted);
  }, [audio, muted]);

  useEffect(() => attachFullscreenListeners(), []);

  useEffect(() => subscribeFullscreen(setFullscreen), []);

  useEffect(() => {
    const paused = state.phase === 'paused';
    if (paused && !wasPaused.current) {
      setPauseIndex(PAUSE_DEFAULT_INDEX);
    }
    wasPaused.current = paused;
  }, [state.phase, version]);

  const unlock = () => {
    void audio.unlock();
  };

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      saveMute(next);
      audio.setMuted(next);
      return next;
    });
    void audio.unlock();
  };

  const activatePauseItem = (index: number) => {
    const item = pauseItemAt(index);
    if (item === 'sound') toggleMute();
    else if (item === 'fullscreen') void toggleFullscreen();
    else dispatch(game, { type: 'resume' });
  };

  pauseMenuRef.current = {
    navigate: (dir) => setPauseIndex((i) => movePauseIndex(i, dir)),
    confirm: () => activatePauseItem(pauseIndexRef.current),
  };

  return (
    <div ref={shellRef} className="shell" onPointerDown={unlock} onKeyDown={unlock}>
      <div
        ref={stageRef}
        className="stage"
        style={{
          // Inset chrome to align with the green baseline ends.
          ['--play-inset-x' as string]: `${playViewInsetXPercent()}%`,
          ['--play-inset-y' as string]: `${playViewInsetYPercent()}%`,
        }}
      >
        <GameCanvas
          state={state}
          version={version}
          motionSnapshot={motionSnapshot}
          advanceRef={advanceRef}
        />
        <Hud state={state} />
        <FooterBar state={state} />
      </div>
      <Overlay
        state={state}
        muted={muted}
        fullscreen={fullscreen}
        pauseIndex={pauseIndex}
        onPauseSelect={setPauseIndex}
        onPauseActivate={activatePauseItem}
      />
    </div>
  );
}
