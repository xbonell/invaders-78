import type { CSSProperties, ReactNode } from 'react';
import type { VoxelRecipe } from '../scene/voxels/recipes';

/** Flat 2D silhouette from a voxel recipe grid (HUD / score table). */
export function RecipeSprite({
  recipe,
  className,
  pixelSize = 3,
}: {
  recipe: VoxelRecipe;
  className?: string;
  /** CSS px per grid cell */
  pixelSize?: number;
}) {
  const rows = recipe.grid.length;
  const cols = recipe.grid.reduce((m, r) => Math.max(m, r.length), 0);

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${pixelSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${pixelSize}px)`,
    width: cols * pixelSize,
    height: rows * pixelSize,
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
            width: pixelSize,
            height: pixelSize,
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
