import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameState } from '../game/types';
import { PLAYER, PLAYFIELD } from '../game/constants';
import { alienWorldPos } from '../game/formation';
import { BunkerMesh } from './meshes/BunkerMesh';
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
}: {
  state: GameState;
  version: number;
}) {
  const aliens = useMemo(() => {
    return state.aliens
      .filter((a) => a.alive)
      .map((a) => ({ a, p: alienWorldPos(a, state.formation) }));
  }, [state.aliens, state.formation, version]);

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

      <mesh position={[0, 0.04, PLAYER.z - 0.85]} castShadow receiveShadow>
        <boxGeometry args={[PLAYFIELD.width - 1, 0.1, 0.14]} />
        <meshLambertMaterial color="#3ecf6a" />
      </mesh>

      {state.player.alive && (
        <group position={[state.player.x, 0, state.player.z]}>
          <VoxelBody recipe={PLAYER_RECIPE} />
        </group>
      )}

      {aliens.map(({ a, p }) => (
        <group key={a.id} position={[p.x, 0, p.z]}>
          <VoxelBody
            recipe={alienRecipe(a.type, state.formation.animFrame)}
          />
        </group>
      ))}

      {state.bunkers.map((b, i) => (
        <BunkerMesh key={i} bunker={b} />
      ))}

      {state.playerBullet && (
        <GlowBullet
          x={state.playerBullet.x}
          z={state.playerBullet.z}
          fromPlayer
        />
      )}

      {state.alienBullets.map((b, i) => (
        <GlowBullet key={`ab-${i}`} x={b.x} z={b.z} fromPlayer={false} />
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
