import type { MutableRefObject, RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import type { GameState } from '../game/types';
import type { MotionSnapshot } from '../game/playerRender';
import { GameSimDriver, OrthoCameraRig, Playfield } from './Playfield';

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
      shadows="percentage"
      camera={{ position: [0, 30, 0], near: 0.1, far: 100, zoom: 1 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', display: 'block' }}
      onCreated={({ camera, gl }) => {
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
        gl.shadowMap.enabled = true;
      }}
    >
      <color attach="background" args={['#050505']} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#9eb6ff', '#1a1a1a', 0.4]} />
      <directionalLight
        castShadow
        intensity={1.1}
        position={[10, 18, 8]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0002}
      />
      <GameSimDriver advanceRef={advanceRef} />
      <OrthoCameraRig />
      <Playfield state={state} version={version} motionSnapshot={motionSnapshot} />
    </Canvas>
  );
}
