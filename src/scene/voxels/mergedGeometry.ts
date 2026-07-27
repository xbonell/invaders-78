import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { recipeToBits, type VoxelRecipe } from './recipes';

const cache = new WeakMap<VoxelRecipe, THREE.BufferGeometry>();

/**
 * One BufferGeometry for a recipe silhouette (merged boxes).
 * Cached by recipe object identity — use stable recipe consts / alienRecipe().
 */
export function recipeToMergedGeometry(recipe: VoxelRecipe): THREE.BufferGeometry {
  const hit = cache.get(recipe);
  if (hit) return hit;

  const bits = recipeToBits(recipe);
  if (bits.length === 0) {
    const empty = new THREE.BufferGeometry();
    cache.set(recipe, empty);
    return empty;
  }

  const parts = bits.map((bit) => {
    const g = new THREE.BoxGeometry(bit.size, bit.size, bit.size);
    g.translate(bit.x, bit.y, bit.z);
    return g;
  });
  const merged = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  if (!merged) {
    throw new Error('recipeToMergedGeometry: mergeGeometries failed');
  }
  merged.computeBoundingSphere();
  cache.set(recipe, merged);
  return merged;
}
