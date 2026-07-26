import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AlienShotType } from '../../game/types';
import { alienShotRecipe, recipeToBits } from '../voxels/recipes';

/** Per-type additive glow: Rolling red, Plunger blue, Squiggly purple. */
const SHOT_GLOW: Record<
  AlienShotType,
  { core: string; mid: string; halo: string }
> = {
  rolling: { core: '#ffb4b4', mid: '#fb7185', halo: '#e11d48' },
  plunger: { core: '#dbeafe', mid: '#38bdf8', halo: '#2563eb' },
  squiggly: { core: '#e9d5ff', mid: '#c084fc', halo: '#7c3aed' },
};

/**
 * Classic Rolling / Plunger / Squiggly silhouettes with the old laser glow
 * (additive halo + mid + hot core), not Lambert voxels.
 */
export function GlowAlienShot({
  type,
  frame,
  x,
  z,
}: {
  type: AlienShotType;
  frame: number;
  x: number;
  z: number;
}) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const bits = useMemo(
    () => recipeToBits(alienShotRecipe(type, frame)),
    [type, frame],
  );
  const { core, mid, halo } = SHOT_GLOW[type];

  useFrame((_, dt) => {
    if (!group.current) return;
    elapsed.current += dt;
    const s = 1 + 0.12 * Math.sin(elapsed.current * 40);
    group.current.scale.set(s, s, 1);
  });

  return (
    <group ref={group} position={[x, 0.45, z]}>
      {bits.map((b, i) => (
        <group key={i} position={[b.x, b.y * 0.35, b.z]}>
          <mesh>
            <boxGeometry args={[b.size * 2.2, b.size * 2.2, b.size * 2.2]} />
            <meshBasicMaterial
              color={halo}
              transparent
              opacity={0.2}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[b.size * 1.25, b.size * 1.25, b.size * 1.25]} />
            <meshBasicMaterial
              color={mid}
              transparent
              opacity={0.7}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[b.size * 0.55, b.size * 0.55, b.size * 0.55]} />
            <meshBasicMaterial
              color={core}
              transparent
              opacity={1}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
