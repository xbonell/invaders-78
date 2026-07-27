/** Classic arcade silhouettes as voxel grids (top-down XZ).
 * Alien bitmaps traced from the official sprite sheet:
 * UFO, octopus×2, crab×2, squid×2.
 */

import { VOXEL_SIZE } from '../../game/logicalSpace';

export type CellH = 0 | 1 | 2; // empty | short | tall

export interface VoxelRecipe {
  /** row 0 = toward +Z (screen top); values 0/1/2 */
  grid: CellH[][];
  color: string;
  cell: number;
}

export interface VoxelBit {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
}

/** Parse rows of `.` empty, `#` short, `H` tall. */
function parse(rows: string[], cell: number, color: string): VoxelRecipe {
  const grid: CellH[][] = rows.map((row) =>
    Array.from(row, (ch) => {
      if (ch === 'H' || ch === '2') return 2;
      if (ch === '#' || ch === '1' || ch === 'X') return 1;
      return 0;
    }),
  );
  return { grid, color, cell };
}

export function recipeToBits(recipe: VoxelRecipe): VoxelBit[] {
  const { grid, cell, color } = recipe;
  const rows = grid.length;
  const cols = grid.reduce((m, r) => Math.max(m, r.length), 0);
  const ox = ((cols - 1) * cell) / 2;
  const oz = ((rows - 1) * cell) / 2;
  const bits: VoxelBit[] = [];
  const gap = 0.92;

  for (let r = 0; r < rows; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const h = row[c];
      if (h === 0) continue;
      const x = c * cell - ox;
      const z = oz - r * cell;
      const layers = h === 2 ? 2 : 1;
      for (let ly = 0; ly < layers; ly++) {
        bits.push({
          x,
          y: cell * 0.5 + ly * cell,
          z,
          size: cell * gap,
          color,
        });
      }
    }
  }
  return bits;
}

const C_ALIEN = '#ffffff';
const C_PLAYER = '#22e35a';
const C_UFO = '#e11d48';
const C_BUNKER = '#22e35a';

/** Player cannon — classic turret silhouette */
export const PLAYER_RECIPE = parse(
  [
    '......H......',
    '.....###.....',
    '.....###.....',
    '.###########.',
    '#############',
    '#############',
    '#############',
    '#############',
  ],
  VOXEL_SIZE,
  C_PLAYER,
);

/**
 * Squid — formation top row (30 pts). Sheet: bottom-right pair.
 * Narrow body, crossed / split tentacles between frames.
 */
export const SQUID_A = parse(
  ['...##...', '..####..', '.######.', '##.##.##', '########', '.#.##.#.', '#......#', '.#....#.'],
  VOXEL_SIZE,
  C_ALIEN,
);

export const SQUID_B = parse(
  ['...##...', '..####..', '.######.', '##.##.##', '########', '..#..#..', '.#.##.#.', '#.#..#.#'],
  VOXEL_SIZE,
  C_ALIEN,
);

/**
 * Crab — formation middle rows (20 pts). Sheet: bottom-left pair.
 * Antenna / claw pose changes between frames.
 */
export const CRAB_A = parse(
  [
    '..#.....#..',
    '...#...#...',
    '..#######..',
    '.##.###.##.',
    '###########',
    '#.#######.#',
    '#.#.....#.#',
    '...##.##...',
  ],
  VOXEL_SIZE,
  C_ALIEN,
);

export const CRAB_B = parse(
  [
    '..#.....#..',
    '#..#...#..#',
    '#.#######.#',
    '###.###.###',
    '###########',
    '.#########.',
    '..#.....#..',
    '.#.......#.',
  ],
  VOXEL_SIZE,
  C_ALIEN,
);

/**
 * Octopus — formation bottom rows (10 pts). Sheet: top row beside UFO.
 * Widest alien; feet open vs closed.
 */
export const OCTOPUS_A = parse(
  [
    '....####....',
    '.##########.',
    '############',
    '###..##..###',
    '############',
    '..###..###..',
    '.##..##..##.',
    '..##....##..',
  ],
  VOXEL_SIZE,
  C_ALIEN,
);

export const OCTOPUS_B = parse(
  [
    '....####....',
    '.##########.',
    '############',
    '###..##..###',
    '############',
    '...##..##...',
    '..##.##.##..',
    '##........##',
  ],
  VOXEL_SIZE,
  C_ALIEN,
);

/**
 * Mystery UFO — sheet top-left saucer.
 * Dome pixels taller (H) for a clearer 3D disc.
 * Three frames: underside lights chase (window row only).
 */
const UFO_BODY = ['.....HHHHHH.....', '...##########...', '..############..'] as const;
const UFO_BELLY = ['################', '..###..##..###..', '...#........#...'] as const;
const UFO_WINDOW_FRAMES = ['.##.##.##.##.##.', '#.##.##.##.##.##', '##.##.##.##.##.#'] as const;

const UFO_FRAMES = UFO_WINDOW_FRAMES.map((windows) =>
  parse([...UFO_BODY, windows, ...UFO_BELLY], VOXEL_SIZE, C_UFO),
);

export function ufoRecipe(frame: 0 | 1 | 2): VoxelRecipe {
  return UFO_FRAMES[frame];
}

/** Alias of frame 0 for callers that do not animate. */
export const UFO_RECIPE = ufoRecipe(0);

export const BUNKER_COLOR = C_BUNKER;

const C_SHOT = '#ffffff';
const SHOT_CELL = VOXEL_SIZE;

/** Squiggly ×4 — zigzag (Wikimedia strip left group). */
const SQUIGGLY_FRAMES = [
  parse(['..#..', '.#...', '..#..', '...#.', '..#..', '.#...', '..#..'], SHOT_CELL, C_SHOT),
  parse(['.#...', '..#..', '...#.', '..#..', '.#...', '..#..', '...#.'], SHOT_CELL, C_SHOT),
  parse(['..#..', '...#.', '..#..', '.#...', '..#..', '...#.', '..#..'], SHOT_CELL, C_SHOT),
  parse(['...#.', '..#..', '.#...', '..#..', '...#.', '..#..', '.#...'], SHOT_CELL, C_SHOT),
] as const;

/** Rolling ×4 — stem + sliding bar (middle group). */
const ROLLING_FRAMES = [
  parse(['..#..', '..#..', '..#..', '..#..', '..#..', '.###.'], SHOT_CELL, C_SHOT),
  parse(['..#..', '..#..', '..#..', '.###.', '..#..', '..#..'], SHOT_CELL, C_SHOT),
  parse(['..#..', '..#..', '.###.', '..#..', '..#..', '..#..'], SHOT_CELL, C_SHOT),
  parse(['.###.', '..#..', '..#..', '..#..', '..#..', '..#..'], SHOT_CELL, C_SHOT),
] as const;

/** Plunger ×4 — stem / offset bars (right group). */
const PLUNGER_FRAMES = [
  parse(['..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'], SHOT_CELL, C_SHOT),
  parse(['..#..', '..#..', '.##..', '..##.', '..#..', '.##..', '..##.'], SHOT_CELL, C_SHOT),
  parse(['..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'], SHOT_CELL, C_SHOT),
  parse(['..##.', '.##..', '..#..', '..##.', '.##..', '..#..', '..#..'], SHOT_CELL, C_SHOT),
] as const;

const SHOT_EXPLOSION = parse(['.#.#.', '#.#.#', '.#.#.', '#.#.#'], SHOT_CELL, C_SHOT);

export function alienShotRecipe(
  type: 'rolling' | 'plunger' | 'squiggly',
  frame: number,
): VoxelRecipe {
  const i = ((frame % 4) + 4) % 4;
  if (type === 'squiggly') return SQUIGGLY_FRAMES[i];
  if (type === 'rolling') return ROLLING_FRAMES[i];
  return PLUNGER_FRAMES[i];
}

export function alienShotExplosionRecipe(): VoxelRecipe {
  return SHOT_EXPLOSION;
}

export function alienRecipe(type: 'squid' | 'crab' | 'octopus', frame: 0 | 1): VoxelRecipe {
  if (type === 'squid') return frame === 0 ? SQUID_A : SQUID_B;
  if (type === 'crab') return frame === 0 ? CRAB_A : CRAB_B;
  return frame === 0 ? OCTOPUS_A : OCTOPUS_B;
}
