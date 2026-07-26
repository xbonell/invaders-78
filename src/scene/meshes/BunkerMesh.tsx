import { BUNKER } from '../../game/constants';
import type { Bunker } from '../../game/types';
import { bunkerCellWorld } from '../../game/formation';
import { BUNKER_COLOR } from '../voxels/recipes';

export function BunkerMesh({ bunker }: { bunker: Bunker }) {
  const cells: { x: number; z: number; key: number }[] = [];
  for (let i = 0; i < bunker.cells.length; i++) {
    const w = bunkerCellWorld(bunker, i);
    if (w) cells.push({ ...w, key: i });
  }
  const s = BUNKER.cellSize * 0.9;
  const d = BUNKER.cellDepth * 0.9;
  const h = BUNKER.stackSize * 1.35;
  return (
    <group>
      {cells.map((c) => (
        <group key={c.key} position={[c.x, 0, c.z]}>
          <mesh position={[0, h * 0.5, 0]}>
            <boxGeometry args={[s, h, d]} />
            <meshLambertMaterial color={BUNKER_COLOR} />
          </mesh>
          <mesh position={[0, h * 1.35, 0]}>
            <boxGeometry args={[s * 0.85, h * 0.7, d * 0.85]} />
            <meshLambertMaterial color={BUNKER_COLOR} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
