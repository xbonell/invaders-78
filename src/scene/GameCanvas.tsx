import type { MutableRefObject, RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { GameState } from '../game/types';
import type { MotionSnapshot } from '../game/playerRender';
import { applyHostSize, canvasNeedsRemount } from './canvasRecovery';
import { GameSimDriver, OrthoCameraRig, Playfield } from './Playfield';

/** Keep WebGL clear fully transparent so `.shell` CSS backdrop shows through. */
function TransparentClear() {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    scene.background = null;
    scene.fog = null;
    gl.setClearColor(0x000000, 0);
    gl.setClearAlpha(0);
  }, [gl, scene]);
  return null;
}

/**
 * Some GPUs drop the WebGL context on fullscreen (dual-GPU switch). Three can
 * "restore" without rebuilding resources → blank transparent canvas; remount.
 */
function ContextLossRemount({ onLost }: { onLost: () => void }) {
  const gl = useThree((s) => s.gl);
  const onLostRef = useRef(onLost);
  onLostRef.current = onLost;

  useEffect(() => {
    const canvas = gl.domElement;
    let scheduled = false;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      if (scheduled) return;
      scheduled = true;
      // Dispose/remount after the event yields — unsafe inside the handler.
      queueMicrotask(() => onLostRef.current());
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    return () => canvas.removeEventListener('webglcontextlost', onContextLost);
  }, [gl]);

  return null;
}

/**
 * After fullscreen layout, re-sync the drawing buffer. If the context died or
 * the buffer stayed 0×0, remount so the playfield returns.
 */
function FullscreenCanvasRecovery({ onNeedsRemount }: { onNeedsRemount: () => void }) {
  const gl = useThree((s) => s.gl);
  const setSize = useThree((s) => s.setSize);
  const remountRef = useRef(onNeedsRemount);
  remountRef.current = onNeedsRemount;

  useEffect(() => {
    const recover = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const host = gl.domElement.parentElement;
          const sizeApplied = applyHostSize(
            () => {
              if (!host) return null;
              const r = host.getBoundingClientRect();
              return { width: r.width, height: r.height };
            },
            (width, height) => setSize(width, height),
          );
          const ctx = gl.getContext();
          const contextLost = ctx == null || ctx.isContextLost();
          if (
            canvasNeedsRemount({
              sizeApplied,
              contextLost,
              bufferWidth: gl.domElement.width,
              bufferHeight: gl.domElement.height,
            })
          ) {
            remountRef.current();
          }
        });
      });
    };
    document.addEventListener('fullscreenchange', recover);
    return () => document.removeEventListener('fullscreenchange', recover);
  }, [gl, setSize]);

  return null;
}

export function GameCanvas({
  state,
  version,
  motionSnapshot,
  advanceRef,
  onContextLost,
}: {
  state: GameState;
  version: number;
  motionSnapshot: MutableRefObject<MotionSnapshot>;
  advanceRef: RefObject<(now: number) => void>;
  /** Bump Canvas `key` so a fresh WebGL context is created. */
  onContextLost: () => void;
}) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 30, 0], near: 0.1, far: 100, zoom: 1 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
      }}
      style={{ width: '100%', height: '100%', display: 'block', background: 'transparent' }}
      onCreated={({ camera, gl, scene }) => {
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
        scene.background = null;
        gl.setClearColor(0x000000, 0);
        gl.setClearAlpha(0);
      }}
    >
      <TransparentClear />
      <ContextLossRemount onLost={onContextLost} />
      <FullscreenCanvasRecovery onNeedsRemount={onContextLost} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#9eb6ff', '#1a1a1a', 0.4]} />
      <directionalLight intensity={1.1} position={[10, 18, 8]} />
      <GameSimDriver advanceRef={advanceRef} />
      <OrthoCameraRig />
      <Playfield state={state} version={version} motionSnapshot={motionSnapshot} />
    </Canvas>
  );
}
