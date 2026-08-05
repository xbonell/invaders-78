import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RenderBackendProps } from '../../../../arcade/render/types';
import {
  orthoPlayViewFrustum,
  shouldUpdateOrthoFrustum,
} from '../../../../shell/canvas/orthoPlayView';
import { playViewDepth, playViewWidth } from '../../game/playView';
import type { GameState } from '../../game/types';
import type { MotionSnapshot } from '../../motion/playerRender';
import { Playfield } from '../../scene/Playfield';

function OrthoCameraRig() {
  const lastSize = useRef({ width: 0, height: 0 });
  useFrame(({ camera, size }) => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    if (!shouldUpdateOrthoFrustum(lastSize.current, size)) return;
    lastSize.current = { width: size.width, height: size.height };

    const aspect = size.width / size.height;
    const frustum = orthoPlayViewFrustum(aspect, playViewWidth(), playViewDepth());
    camera.left = frustum.left;
    camera.right = frustum.right;
    camera.top = frustum.top;
    camera.bottom = frustum.bottom;
    camera.position.set(0, 30, 0);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  });

  return null;
}

/** Voxel graphics engine for Invaders — implements the shared RenderBackend contract. */
export function VoxelRenderBackend({
  state,
  version,
  motionSnapshot,
}: RenderBackendProps<GameState, MotionSnapshot>) {
  return (
    <>
      <OrthoCameraRig />
      <Playfield state={state} version={version} motionSnapshot={motionSnapshot} />
    </>
  );
}
