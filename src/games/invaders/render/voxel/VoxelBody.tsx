import { useMemo } from 'react';
import type { VoxelBit, VoxelRecipe } from './recipes';
import { recipeToBits } from './recipes';

export function VoxelBody({
  recipe,
  castShadow = false,
  receiveShadow = false,
}: {
  recipe: VoxelRecipe;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const bits = useMemo(() => recipeToBits(recipe), [recipe]);
  return <VoxelBits bits={bits} castShadow={castShadow} receiveShadow={receiveShadow} />;
}

export function VoxelBits({
  bits,
  castShadow = true,
  receiveShadow = false,
}: {
  bits: VoxelBit[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  return (
    <group>
      {bits.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, b.y, b.z]}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        >
          <boxGeometry args={[b.size, b.size, b.size]} />
          <meshLambertMaterial color={b.color} />
        </mesh>
      ))}
    </group>
  );
}
