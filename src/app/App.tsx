import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from '../audio/engine';
import { playViewDepth, playViewWidth } from '../game/playView';
import { dispatch } from '../game/simulation';
import { loadMute, saveMute } from '../game/storage';
import { useGameLoop } from '../hooks/useGameLoop';
import { GameCanvas } from '../scene/GameCanvas';
import { attachFullscreenListeners, subscribeFullscreen, toggleFullscreen } from './fullscreen';
import { FooterBar, Hud, Overlay } from './Hud';
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
  const { game, state, version, motionSnapshot, advanceRef } = useGameLoop(audio, pauseMenuRef);
  const wasPaused = useRef(false);

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

  const viewW = playViewWidth();
  const viewD = playViewDepth();

  return (
    <div className="shell" onPointerDown={unlock} onKeyDown={unlock}>
      <div
        className="stage"
        style={{
          aspectRatio: `${viewW} / ${viewD}`,
          width: `min(100%, calc(100dvh * ${viewW} / ${viewD}))`,
          height: `min(100%, calc(100dvw * ${viewD} / ${viewW}))`,
        }}
      >
        <GameCanvas
          state={state}
          version={version}
          motionSnapshot={motionSnapshot}
          advanceRef={advanceRef}
        />
        <Hud state={state} />
        <Overlay
          state={state}
          muted={muted}
          fullscreen={fullscreen}
          pauseIndex={pauseIndex}
          onPauseSelect={setPauseIndex}
          onPauseActivate={activatePauseItem}
        />
        <FooterBar state={state} />
      </div>
    </div>
  );
}
