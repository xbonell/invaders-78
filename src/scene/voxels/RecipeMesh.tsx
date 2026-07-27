import { useMemo } from 'react';
import type { VoxelRecipe } from './recipes';
import { recipeToMergedGeometry } from './mergedGeometry';

/** Single draw-call silhouette from a voxel recipe (movers). */
export function RecipeMesh({
  recipe,
  castShadow = false,
}: {
  recipe: VoxelRecipe;
  castShadow?: boolean;
}) {
  const geometry = useMemo(() => recipeToMergedGeometry(recipe), [recipe]);
  return (
    <mesh geometry={geometry} castShadow={castShadow}>
      <meshLambertMaterial color={recipe.color} />
    </mesh>
  );
}
