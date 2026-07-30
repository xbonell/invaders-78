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
import { TouchControls } from './TouchControls';
import { CHROME_REF_WIDTH_PX } from './chromeScale';
import { movePauseIndex, PAUSE_DEFAULT_INDEX, pauseItemAt, type PauseMenuInput } from './pauseMenu';
import {
  clampLayout,
  defaultTouchLayout,
  hasStoredTouchLayout,
  layoutsEqual,
  loadTouchLayout,
  saveTouchLayout,
  type TouchLayout,
} from './touchLayout';
import './app.css';

export default function App() {
  const audio = useMemo(() => new AudioEngine(), []);
  const [muted, setMuted] = useState(() => loadMute());
  const [fullscreen, setFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  );
  const [pauseIndex, setPauseIndex] = useState(PAUSE_DEFAULT_INDEX);
  const [layoutEditing, setLayoutEditing] = useState(false);
  const [touchLayout, setTouchLayout] = useState<TouchLayout>(() => loadTouchLayout());
  const layoutBackup = useRef<TouchLayout | null>(null);
  const hadStoredLayout = useRef(false);
  const layoutPrimed = useRef(false);
  const pauseMenuRef = useRef<PauseMenuInput | null>(null);
  const pauseIndexRef = useRef(pauseIndex);
  pauseIndexRef.current = pauseIndex;
  const layoutEditingRef = useRef(layoutEditing);
  layoutEditingRef.current = layoutEditing;
  const shellRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { game, state, version, bumpUi, motionSnapshot, advanceRef } = useGameLoop(
    audio,
    pauseMenuRef,
  );
  const [glReady, setGlReady] = useState(false);
  const wasPaused = useRef(false);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      setGlReady(true);
      return undefined;
    }

    let revoke: (() => void) | undefined;
    try {
      // Bake before the game canvas mounts so iOS Safari does not juggle two
      // WebGL contexts (often loses the playfield → black screen).
      const soft =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
        window.matchMedia('(pointer: coarse)').matches;
      const baked = bakeBackdrop(soft ? { width: 960, height: 540 } : undefined);
      applyBackdropUrl(shell, baked.url);
      revoke = baked.dispose;
    } catch {
      // Solid shell bg remains; still allow the game canvas to mount.
    }
    setGlReady(true);
    return () => revoke?.();
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--stage-aspect', String(playViewAspect()));

    const stage = stageRef.current;
    if (!stage) return undefined;

    hadStoredLayout.current = hasStoredTouchLayout();

    const syncStage = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      root.style.setProperty('--stage-w', `${width}px`);
      const scale = width / CHROME_REF_WIDTH_PX;
      root.style.setProperty('--chrome-scale', String(scale));

      setTouchLayout((prev) => {
        const base =
          !layoutPrimed.current && !hadStoredLayout.current
            ? defaultTouchLayout(width, height, scale)
            : prev;
        layoutPrimed.current = true;
        const next = clampLayout(base, width, height, scale);
        if (layoutsEqual(next, prev)) return prev;
        // Persist when a stored layout had to move back on-screen after resize.
        if (hadStoredLayout.current) saveTouchLayout(next);
        return next;
      });
    };
    syncStage();
    const ro = new ResizeObserver(syncStage);
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
      setLayoutEditing(false);
      layoutBackup.current = null;
    }
    if (!paused && wasPaused.current) {
      setLayoutEditing(false);
      layoutBackup.current = null;
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

  const beginLayoutEdit = () => {
    layoutBackup.current = { ...touchLayout };
    setLayoutEditing(true);
  };

  const finishLayoutEdit = (save: boolean) => {
    if (save) {
      saveTouchLayout(touchLayout);
      hadStoredLayout.current = true;
    } else if (layoutBackup.current) {
      setTouchLayout(layoutBackup.current);
    }
    layoutBackup.current = null;
    setLayoutEditing(false);
  };

  const activatePauseItem = (index: number) => {
    const item = pauseItemAt(index);
    if (item === 'sound') toggleMute();
    else if (item === 'fullscreen') void toggleFullscreen();
    else if (item === 'controls') beginLayoutEdit();
    else dispatch(game, { type: 'resume' });
  };

  pauseMenuRef.current = {
    navigate: (dir) => {
      if (layoutEditingRef.current) return;
      setPauseIndex((i) => movePauseIndex(i, dir));
    },
    confirm: () => {
      if (layoutEditingRef.current) {
        finishLayoutEdit(true);
        return;
      }
      activatePauseItem(pauseIndexRef.current);
    },
    escape: () => {
      if (!layoutEditingRef.current) return false;
      finishLayoutEdit(false);
      return true;
    },
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
        <div className="game-canvas-host">
          {glReady ? (
            <GameCanvas
              state={state}
              version={version}
              motionSnapshot={motionSnapshot}
              advanceRef={advanceRef}
            />
          ) : null}
        </div>
        <Hud state={state} />
        <FooterBar state={state} />
        <TouchControls
          game={game}
          phase={state.phase}
          layout={touchLayout}
          editing={layoutEditing}
          onLayoutChange={setTouchLayout}
          onGesture={unlock}
          onUi={bumpUi}
        />
      </div>
      <Overlay
        state={state}
        muted={muted}
        fullscreen={fullscreen}
        pauseIndex={pauseIndex}
        layoutEditing={layoutEditing}
        onPauseSelect={setPauseIndex}
        onPauseActivate={activatePauseItem}
        onLayoutDone={() => finishLayoutEdit(true)}
      />
    </div>
  );
}
