import type { CSSProperties, ReactNode } from 'react';
import type { VoxelRecipe } from '../scene/voxels/recipes';

/** Flat 2D silhouette from a voxel recipe grid (HUD / score table). */
export function RecipeSprite({
  recipe,
  className,
  /** rem per grid cell; scales with parent chrome zoom */
  cellRem = 0.1875,
}: {
  recipe: VoxelRecipe;
  className?: string;
  cellRem?: number;
}) {
  const rows = recipe.grid.length;
  const cols = recipe.grid.reduce((m, r) => Math.max(m, r.length), 0);
  const cell = `${cellRem}rem`;

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${cell})`,
    gridTemplateRows: `repeat(${rows}, ${cell})`,
    width: `${cols * cellRem}rem`,
    height: `${rows * cellRem}rem`,
    flexShrink: 0,
  };

  const cells: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const row = recipe.grid[r];
    for (let c = 0; c < cols; c++) {
      const h = row[c] ?? 0;
      cells.push(
        <span
          key={`${r}-${c}`}
          style={{
            background: h > 0 ? recipe.color : 'transparent',
            width: cell,
            height: cell,
          }}
        />,
      );
    }
  }

  return (
    <span className={className} style={style} aria-hidden>
      {cells}
    </span>
  );
}
