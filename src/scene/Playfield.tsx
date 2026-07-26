import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameState } from '../game/types';
import { ALIEN_SHOT, GROUND_LINE, PLAYER, PLAYFIELD } from '../game/constants';
import { allAlienShotSlots } from '../game/alienShots';
import { alienWorldPos } from '../game/formation';
import { logicalToWorld } from '../game/logicalSpace';
import { BunkerMesh } from './meshes/BunkerMesh';
import { GlowAlienShot } from './meshes/GlowAlienShot';
import { GlowBullet } from './meshes/GlowBullet';
import { VoxelBody } from './voxels/VoxelBody';
import { DebrisField } from './voxels/DebrisField';
import {
  alienRecipe,
  PLAYER_RECIPE,
  UFO_RECIPE,
} from './voxels/recipes';

export function Playfield({
  state,
  version,
  renderPlayerX,
}: {
  state: GameState;
  version: number;
  renderPlayerX: number;
}) {
  const aliens = useMemo(() => {
    return state.aliens
      .filter((a) => a.alive)
      .map((a) => ({ a, p: alienWorldPos(a, state.formation) }));
  }, [state.aliens, state.formation, version]);

  const alienShots = useMemo(() => {
    return allAlienShotSlots(state.alienShots)
      .filter((s) => s.state === 'active')
      .map((s) => {
        const w = logicalToWorld(
          s.position.x + ALIEN_SHOT.hitboxHalfW,
          s.position.y + ALIEN_SHOT.hitboxHalfH,
        );
        return { s, w };
      });
  }, [state.alienShots, version]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
      >
        <planeGeometry args={[PLAYFIELD.width + 4, PLAYFIELD.depth + 4]} />
        <meshLambertMaterial color="#050505" />
      </mesh>

      <mesh position={[0, GROUND_LINE.y, PLAYER.z - GROUND_LINE.zOffset]}>
        <boxGeometry
          args={[GROUND_LINE.width, GROUND_LINE.y, GROUND_LINE.thickness]}
        />
        <meshLambertMaterial color="#3ecf6a" />
      </mesh>

      {state.player.alive && (
        <group position={[renderPlayerX, 0, state.player.z]}>
          <VoxelBody recipe={PLAYER_RECIPE} />
        </group>
      )}

      {state.bunkers.map((b, i) => (
        <BunkerMesh key={i} bunker={b} />
      ))}

      {/* Above bunker stacks so formation stays visually in front when overlapping */}
      {aliens.map(({ a, p }) => (
        <group key={a.id} position={[p.x, 0.85, p.z]}>
          <VoxelBody
            recipe={alienRecipe(a.type, state.formation.animFrame)}
          />
        </group>
      ))}

      {state.playerBullet && (
        <GlowBullet
          x={state.playerBullet.x}
          z={state.playerBullet.z}
          fromPlayer
        />
      )}

      {alienShots.map(({ s, w }) => (
        <GlowAlienShot
          key={s.type}
          type={s.type}
          frame={s.animationFrame}
          x={w.x}
          z={w.z}
        />
      ))}

      {state.ufo && (
        <group position={[state.ufo.x, 0, state.ufo.z]}>
          <VoxelBody recipe={UFO_RECIPE} />
        </group>
      )}

      <DebrisField />
    </group>
  );
}

export function OrthoCameraRig() {
  useFrame(({ camera, size }) => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const aspect = size.width / Math.max(size.height, 1);
    const viewH = 28;
    const viewW = viewH * aspect;
    camera.left = -viewW / 2;
    camera.right = viewW / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.position.set(0, 30, 0);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  });

  return null;
}
