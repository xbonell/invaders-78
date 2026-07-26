import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionSnapshot } from '../../game/playerRender';

/** Thin, bright cinematic laser bolt (top-down). Position via snapshot useFrame. */
export function GlowBullet({
  fromPlayer,
  motionSnapshot,
}: {
  fromPlayer: boolean;
  motionSnapshot: MutableRefObject<MotionSnapshot>;
}) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const coreColor = fromPlayer ? '#ffffff' : '#ffb4b4';
  const midColor = fromPlayer ? '#fef08a' : '#fb7185';
  const haloColor = fromPlayer ? '#facc15' : '#e11d48';
  const len = fromPlayer ? 0.85 : 0.7;

  const attach = (node: THREE.Group | null) => {
    group.current = node;
    if (!node) return;
    const s = motionSnapshot.current;
    node.visible = s.playerBulletVisible;
    node.position.set(s.playerBulletX, 0.5, s.playerBulletZ);
  };

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const s = motionSnapshot.current;
    g.visible = s.playerBulletVisible;
    if (!s.playerBulletVisible) return;
    g.position.x = s.playerBulletX;
    g.position.z = s.playerBulletZ;
    elapsed.current += dt;
    const scale = 1 + 0.12 * Math.sin(elapsed.current * 40);
    g.scale.set(scale, scale, 1);
  });

  return (
    <group ref={attach}>
      <mesh>
        <boxGeometry args={[0.22, 0.22, len * 1.05]} />
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
        <boxGeometry args={[0.08, 0.08, len]} />
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
        <boxGeometry args={[0.035, 0.035, len * 1.02]} />
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
}
