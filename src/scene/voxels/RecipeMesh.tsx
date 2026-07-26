import { useMemo } from 'react';
import type { VoxelRecipe } from './recipes';
import { recipeToMergedGeometry } from './mergedGeometry';

/** Single draw-call silhouette from a voxel recipe (movers). */
export function RecipeMesh({ recipe }: { recipe: VoxelRecipe }) {
  const geometry = useMemo(() => recipeToMergedGeometry(recipe), [recipe]);
  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial color={recipe.color} />
    </mesh>
  );
}
