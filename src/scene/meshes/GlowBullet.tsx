import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER_BOLT_CELLS, VOXEL_SIZE } from '../../game/constants';
import type { MotionSnapshot } from '../../game/playerRender';

const CORE = VOXEL_SIZE * 0.92;
/**
 * Soft glow: keep X/Y at 1-voxel width; bleed only along Z so the bolt
 * still glows without reading thicker than one cell.
 */
const MID_Z = VOXEL_SIZE * 1.25;
const HALO_Z = VOXEL_SIZE * 2.2;

/** Grid-locked player laser: 1×N square voxels on Z with soft additive glow. */
export function GlowBullet({
  fromPlayer,
  motionSnapshot,
}: {
  fromPlayer: boolean;
  motionSnapshot: MutableRefObject<MotionSnapshot>;
}) {
  const group = useRef<THREE.Group>(null);
  const coreColor = fromPlayer ? '#ffffff' : '#ffb4b4';
  const midColor = fromPlayer ? '#fef08a' : '#fb7185';
  const haloColor = fromPlayer ? '#facc15' : '#e11d48';
  const cells = fromPlayer ? PLAYER_BOLT_CELLS : Math.max(4, PLAYER_BOLT_CELLS - 1);
  const oz = ((cells - 1) * VOXEL_SIZE) / 2;

  const attach = (node: THREE.Group | null) => {
    group.current = node;
    if (!node) return;
    const s = motionSnapshot.current;
    node.visible = s.playerBulletVisible;
    node.position.set(s.playerBulletX, 0.5, s.playerBulletZ);
  };

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = motionSnapshot.current;
    g.visible = s.playerBulletVisible;
    if (!s.playerBulletVisible) return;
    g.position.x = s.playerBulletX;
    g.position.z = s.playerBulletZ;
  });

  return (
    <group ref={attach}>
      {Array.from({ length: cells }, (_, i) => {
        const z = oz - i * VOXEL_SIZE;
        return (
          <group key={i} position={[0, VOXEL_SIZE * 0.5, z]}>
            <mesh>
              <boxGeometry args={[CORE, CORE, HALO_Z]} />
              <meshBasicMaterial
                color={haloColor}
                transparent
                opacity={0.22}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[CORE, CORE, MID_Z]} />
              <meshBasicMaterial
                color={midColor}
                transparent
                opacity={0.7}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[CORE, CORE, CORE]} />
              <meshBasicMaterial
                color={coreColor}
                transparent
                opacity={1}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
