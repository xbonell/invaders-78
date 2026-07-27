import { describe, expect, it } from 'vitest';
import { BUNKER } from '../../game/constants';
import { SCALE_X, VOXEL_SIZE } from '../../game/logicalSpace';
import {
  CRAB_A,
  OCTOPUS_A,
  PLAYER_RECIPE,
  SQUID_A,
  UFO_RECIPE,
  alienShotRecipe,
} from './recipes';

describe('unified voxel grid', () => {
  it('VOXEL_SIZE matches SCALE_X', () => {
    expect(VOXEL_SIZE).toBe(SCALE_X);
  });

  it('all recipes share VOXEL_SIZE cell pitch', () => {
    const recipes = [
      PLAYER_RECIPE,
      SQUID_A,
      CRAB_A,
      OCTOPUS_A,
      UFO_RECIPE,
      alienShotRecipe('rolling', 0),
      alienShotRecipe('plunger', 0),
      alienShotRecipe('squiggly', 0),
    ];
    for (const r of recipes) {
      expect(r.cell).toBe(VOXEL_SIZE);
    }
  });

  it('bunker cells are square on VOXEL_SIZE', () => {
    expect(BUNKER.cellSize).toBe(VOXEL_SIZE);
    expect(BUNKER.cellDepth).toBe(VOXEL_SIZE);
    expect(BUNKER.stackSize).toBe(VOXEL_SIZE * 2);
  });
});
