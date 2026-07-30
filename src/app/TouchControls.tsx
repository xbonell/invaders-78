import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Game } from '../game/simulation';
import { dispatch } from '../game/simulation';
import type { GamePhase } from '../game/types';
import { confirmMenuStart, isStartable, selectMenu } from '../input/actions';
import {
  STICK_DEADZONE,
  clampKnob,
  menuSelectEdge,
  stickAxisToDir,
  stickOffsetToNx,
} from '../input/touch';
import { clampLayout, STICK_HALF_PX, type TouchLayout } from './touchLayout';
import { CHROME_REF_WIDTH_PX } from './chromeScale';

const STICK_RADIUS_PX = STICK_HALF_PX;

function detectTouchUi(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}

function useTouchUiEnabled(): boolean {
  const [enabled, setEnabled] = useState(detectTouchUi);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const sync = () => setEnabled(detectTouchUi());
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return enabled;
}

export type TouchControlsProps = {
  game: Game;
  phase: GamePhase;
  layout: TouchLayout;
  editing?: boolean;
  onLayoutChange?: (layout: TouchLayout) => void;
  onGesture?: () => void | Promise<void>;
  onUi?: () => void;
};

type StickVisual = {
  knobDx: number;
  knobDy: number;
};

type DragKind = 'stick' | 'fire';

export function TouchControls({
  game,
  phase,
  layout,
  editing = false,
  onLayoutChange,
  onGesture,
  onUi,
}: TouchControlsProps) {
  const enabled = useTouchUiEnabled();
  const [stick, setStick] = useState<StickVisual | null>(null);

  const stickPointerId = useRef<number | null>(null);
  const stickOrigin = useRef({ x: 0, y: 0 });
  const stickDir = useRef<-1 | 0 | 1>(0);
  const firePointerId = useRef<number | null>(null);
  const ignoreFireUntilRelease = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  const dragKind = useRef<DragKind | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const clearStickRef = useRef(() => {});
  clearStickRef.current = () => {
    stickPointerId.current = null;
    stickDir.current = 0;
    setStick(null);
    dispatch(gameRef.current, { type: 'move', dir: 0 });
  };

  const withAudio = (fn: () => void) => {
    void onGesture?.();
    fn();
    onUi?.();
  };

  useEffect(() => {
    const onBlur = () => {
      clearStickRef.current();
      firePointerId.current = null;
      ignoreFireUntilRelease.current = false;
      dragKind.current = null;
      dragPointerId.current = null;
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') onBlur();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      clearStickRef.current();
    };
  }, []);

  useEffect(() => {
    if (phase === 'paused' && !editing) clearStickRef.current();
  }, [phase, editing]);

  if (!enabled) return null;
  if (phase === 'paused' && !editing) return null;

  const stageSize = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 1;
    const h = rect?.height ?? 1;
    return {
      w,
      h,
      left: rect?.left ?? 0,
      top: rect?.top ?? 0,
      scale: w / CHROME_REF_WIDTH_PX,
    };
  };

  const stickStyle: CSSProperties = {
    left: `${layout.stickX * 100}%`,
    top: `${layout.stickY * 100}%`,
    width: STICK_RADIUS_PX * 2,
    height: STICK_RADIUS_PX * 2,
    marginLeft: -STICK_RADIUS_PX,
    marginTop: -STICK_RADIUS_PX,
  };

  const actionsStyle: CSSProperties = {
    left: `${layout.fireX * 100}%`,
    top: `${layout.fireY * 100}%`,
    transform: 'translate(-50%, -50%)',
  };

  const beginLayoutDrag = (
    kind: DragKind,
    e: ReactPointerEvent,
    centerX: number,
    centerY: number,
  ) => {
    if (!editing || !onLayoutChange) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragKind.current = kind;
    dragPointerId.current = e.pointerId;
    const { left, top, w, h } = stageSize();
    const cx = left + centerX * w;
    const cy = top + centerY * h;
    dragOffset.current = { x: e.clientX - cx, y: e.clientY - cy };
  };

  const onLayoutMove = (e: ReactPointerEvent) => {
    if (!editing || !onLayoutChange || dragPointerId.current !== e.pointerId || !dragKind.current) {
      return;
    }
    e.preventDefault();
    const { left, top, w, h, scale } = stageSize();
    const nx = (e.clientX - dragOffset.current.x - left) / w;
    const ny = (e.clientY - dragOffset.current.y - top) / h;
    if (dragKind.current === 'stick') {
      onLayoutChange(clampLayout({ ...layout, stickX: nx, stickY: ny }, w, h, scale));
    } else {
      onLayoutChange(clampLayout({ ...layout, fireX: nx, fireY: ny }, w, h, scale));
    }
  };

  const onLayoutUp = (e: ReactPointerEvent) => {
    if (dragPointerId.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    dragKind.current = null;
    dragPointerId.current = null;
  };

  const applyStickDir = (nextDir: -1 | 0 | 1) => {
    if (isStartable(game)) {
      const edge = menuSelectEdge(stickDir.current, nextDir);
      stickDir.current = nextDir;
      if (edge !== 0) {
        void onGesture?.();
        selectMenu(game, edge);
        onUi?.();
      }
      dispatch(game, { type: 'move', dir: 0 });
      return;
    }

    if (nextDir !== stickDir.current) {
      stickDir.current = nextDir;
      void onGesture?.();
      dispatch(game, { type: 'move', dir: nextDir });
    }
  };

  const onStickDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (editing) {
      beginLayoutDrag('stick', e, layout.stickX, layout.stickY);
      return;
    }
    if (stickPointerId.current != null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    stickPointerId.current = e.pointerId;
    const { left, top, w, h } = stageSize();
    stickOrigin.current = { x: left + layout.stickX * w, y: top + layout.stickY * h };
    stickDir.current = 0;
    setStick({ knobDx: 0, knobDy: 0 });
    // Seed from contact so a press outside center still steers.
    const rawDx = e.clientX - stickOrigin.current.x;
    const rawDy = e.clientY - stickOrigin.current.y;
    const { dx, dy } = clampKnob(rawDx, rawDy, STICK_RADIUS_PX);
    setStick({ knobDx: dx, knobDy: dy });
    applyStickDir(stickAxisToDir(stickOffsetToNx(dx, STICK_RADIUS_PX), STICK_DEADZONE));
  };

  const onStickMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (editing) {
      onLayoutMove(e);
      return;
    }
    if (stickPointerId.current !== e.pointerId) return;
    e.preventDefault();
    const rawDx = e.clientX - stickOrigin.current.x;
    const rawDy = e.clientY - stickOrigin.current.y;
    const { dx, dy } = clampKnob(rawDx, rawDy, STICK_RADIUS_PX);
    setStick({ knobDx: dx, knobDy: dy });
    applyStickDir(stickAxisToDir(stickOffsetToNx(dx, STICK_RADIUS_PX), STICK_DEADZONE));
  };

  const onStickUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (editing) {
      onLayoutUp(e);
      return;
    }
    if (stickPointerId.current !== e.pointerId) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    clearStickRef.current();
  };

  const onFireDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (editing) {
      beginLayoutDrag('fire', e, layout.fireX, layout.fireY);
      return;
    }
    if (firePointerId.current != null) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    firePointerId.current = e.pointerId;
    if (ignoreFireUntilRelease.current) return;
    if (isStartable(game)) {
      withAudio(() => {
        if (confirmMenuStart(game)) ignoreFireUntilRelease.current = true;
      });
      return;
    }
    withAudio(() => dispatch(game, { type: 'fire' }));
  };

  const onFireMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (editing) onLayoutMove(e);
  };

  const onFireUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (editing) {
      onLayoutUp(e);
      return;
    }
    if (firePointerId.current !== e.pointerId) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    firePointerId.current = null;
    ignoreFireUntilRelease.current = false;
  };

  const onPause = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (editing) {
      beginLayoutDrag('fire', e, layout.fireX, layout.fireY);
      return;
    }
    if (phase !== 'playing') return;
    withAudio(() => dispatch(game, { type: 'pause' }));
  };

  const showPause = editing || phase === 'playing';

  return (
    <div ref={rootRef} className={`touch-controls${editing ? ' touch-controls-editing' : ''}`}>
      <div
        className={`touch-stick${stick ? ' touch-stick-active' : ''}`}
        style={stickStyle}
        onPointerDown={onStickDown}
        onPointerMove={onStickMove}
        onPointerUp={onStickUp}
        onPointerCancel={onStickUp}
      >
        <div
          className="touch-stick-knob"
          style={
            stick ? { transform: `translate(${stick.knobDx}px, ${stick.knobDy}px)` } : undefined
          }
        />
      </div>
      <div className="touch-actions" style={actionsStyle}>
        {showPause ? (
          <button type="button" className="touch-btn touch-btn-pause" onPointerDown={onPause}>
            Pause
          </button>
        ) : null}
        <button
          type="button"
          className="touch-btn touch-btn-fire"
          onPointerDown={onFireDown}
          onPointerMove={onFireMove}
          onPointerUp={onFireUp}
          onPointerCancel={onFireUp}
        >
          Fire
        </button>
      </div>
    </div>
  );
}
