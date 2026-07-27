import { describe, expect, it } from 'vitest';
import { PLAYER_RECIPE, recipeToBits } from './recipes';
import { recipeToMergedGeometry } from './mergedGeometry';

describe('recipeToMergedGeometry', () => {
  it('has 24 vertices per voxel bit (BoxGeometry corners)', () => {
    const bits = recipeToBits(PLAYER_RECIPE);
    const geom = recipeToMergedGeometry(PLAYER_RECIPE);
    const positions = geom.getAttribute('position');
    expect(positions).toBeTruthy();
    expect(positions.count).toBe(bits.length * 24);
  });

  it('returns the same cached geometry for the same recipe', () => {
    const a = recipeToMergedGeometry(PLAYER_RECIPE);
    const b = recipeToMergedGeometry(PLAYER_RECIPE);
    expect(a).toBe(b);
  });
});
