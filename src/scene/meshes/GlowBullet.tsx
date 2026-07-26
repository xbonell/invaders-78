import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Thin, bright cinematic laser bolt (top-down). */
export function GlowBullet({
  x,
  z,
  fromPlayer,
}: {
  x: number;
  z: number;
  fromPlayer: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const coreColor = fromPlayer ? '#ffffff' : '#ffb4b4';
  const midColor = fromPlayer ? '#fef08a' : '#fb7185';
  const haloColor = fromPlayer ? '#facc15' : '#e11d48';
  const len = fromPlayer ? 0.85 : 0.7;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const s = 1 + 0.12 * Math.sin(clock.elapsedTime * 40);
    group.current.scale.set(s, s, 1);
  });

  return (
    <group ref={group} position={[x, 0.5, z]}>
      {/* Wide soft bloom */}
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
      {/* Mid glow sheath */}
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
      {/* Hot thin core */}
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
