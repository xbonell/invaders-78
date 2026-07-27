import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AlienShotType } from '../../game/types';
import type { MotionSnapshot } from '../../game/playerRender';
import { alienShotRecipe, recipeToBits } from '../voxels/recipes';

/** Per-type additive glow: Rolling red, Plunger blue, Squiggly purple. */
const SHOT_GLOW: Record<AlienShotType, { core: string; mid: string; halo: string }> = {
  rolling: { core: '#ffb4b4', mid: '#fb7185', halo: '#e11d48' },
  plunger: { core: '#dbeafe', mid: '#38bdf8', halo: '#2563eb' },
  squiggly: { core: '#e9d5ff', mid: '#c084fc', halo: '#7c3aed' },
};

/**
 * Classic Rolling / Plunger / Squiggly silhouettes with soft additive glow.
 * Cores stay on the shared voxel grid; halo may bleed past one cell.
 */
export function GlowAlienShot({
  type,
  frame,
  motionSnapshot,
}: {
  type: AlienShotType;
  frame: number;
  motionSnapshot: MutableRefObject<MotionSnapshot>;
}) {
  const group = useRef<THREE.Group>(null);
  const bits = useMemo(() => recipeToBits(alienShotRecipe(type, frame)), [type, frame]);
  const { core, mid, halo } = SHOT_GLOW[type];

  const attach = (node: THREE.Group | null) => {
    group.current = node;
    if (!node) return;
    const s = motionSnapshot.current.alienShots[type];
    node.visible = s.visible;
    node.position.set(s.x, 0.45, s.z);
  };

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = motionSnapshot.current.alienShots[type];
    g.visible = s.visible;
    if (!s.visible) return;
    g.position.x = s.x;
    g.position.z = s.z;
  });

  return (
    <group ref={attach}>
      {bits.map((b, i) => (
        <group key={i} position={[b.x, b.y, b.z]}>
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
            <boxGeometry args={[b.size, b.size, b.size]} />
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
