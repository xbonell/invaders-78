import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { loadMute, saveMute } from '../../../arcade/storage/storage';
import { applyBackdropUrl, getPageBackdrop } from '../../../shell/backdrop/bakeBackdrop';
import { bumpCanvasMountKey } from '../../../shell/canvas/canvasRecovery';
import { GameCanvas } from '../../../shell/canvas/GameCanvas';
import {
  attachFullscreenListeners,
  setFullscreenFocusTarget,
  subscribeFullscreen,
  toggleFullscreen,
} from '../../../shell/chrome/fullscreen';
import { CHROME_REF_WIDTH_PX } from '../../../shell/chrome/chromeScale';
import {
  movePauseIndex,
  PAUSE_DEFAULT_INDEX,
  pauseItemAt,
  type PauseMenuInput,
} from '../../../shell/chrome/pauseMenu';
import { handleDeckPointerFire } from '../../../shell/input/pointerFire';
import { AudioEngine } from '../audio/engine';
import { playViewAspect, playViewInsetXPercent, playViewInsetYPercent } from '../game/playView';
import { dispatch } from '../game/simulation';
import { useInvadersGameLoop } from '../loop/useInvadersGameLoop';
import { VoxelRenderBackend } from '../render/voxel/VoxelRenderBackend';
import { FooterBar, Hud, Overlay } from './Hud';
import '../../../shell/chrome/app.css';

export default function InvadersApp() {
  const audio = useMemo(() => new AudioEngine(), []);
  const [muted, setMuted] = useState(() => loadMute());
  const [fullscreen, setFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  );
  // Remount key: WebGL context loss / dead buffer after fullscreen on some GPUs.
  const [canvasMountKey, setCanvasMountKey] = useState(0);
  const [pauseIndex, setPauseIndex] = useState(PAUSE_DEFAULT_INDEX);
  const pauseMenuRef = useRef<PauseMenuInput | null>(null);
  const pauseIndexRef = useRef(pauseIndex);
  pauseIndexRef.current = pauseIndex;
  const shellRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { game, state, version, motionSnapshot, advanceRef } = useInvadersGameLoop(
    audio,
    pauseMenuRef,
  );
  const wasPaused = useRef(false);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    // Page-lifetime blob — Strict Mode cleanup must not revoke (ERR_FILE_NOT_FOUND).
    applyBackdropUrl(shell, getPageBackdrop().url);
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
    setFullscreenFocusTarget(shellRef.current);
    return () => setFullscreenFocusTarget(null);
  }, []);

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

  const onShellPointerDown = (e: { button: number }) => {
    unlock();
    // Steam Deck desktop: A often becomes left-click after fullscreen.
    handleDeckPointerFire(game, e.button, unlock);
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
    <div
      ref={shellRef}
      className="shell"
      tabIndex={-1}
      onPointerDown={onShellPointerDown}
      onKeyDown={unlock}
    >
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
          key={canvasMountKey}
          advanceRef={advanceRef}
          onContextLost={() => setCanvasMountKey((k) => bumpCanvasMountKey(k))}
        >
          <VoxelRenderBackend state={state} version={version} motionSnapshot={motionSnapshot} />
        </GameCanvas>
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
