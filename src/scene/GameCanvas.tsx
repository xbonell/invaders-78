import type { MutableRefObject, RefObject } from 'react';
import { useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { GameState } from '../game/types';
import type { MotionSnapshot } from '../game/playerRender';
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

export function GameCanvas({
  state,
  version,
  motionSnapshot,
  advanceRef,
}: {
  state: GameState;
  version: number;
  motionSnapshot: MutableRefObject<MotionSnapshot>;
  advanceRef: RefObject<(now: number) => void>;
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
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#9eb6ff', '#1a1a1a', 0.4]} />
      <directionalLight intensity={1.1} position={[10, 18, 8]} />
      <GameSimDriver advanceRef={advanceRef} />
      <OrthoCameraRig />
      <Playfield state={state} version={version} motionSnapshot={motionSnapshot} />
    </Canvas>
  );
}
