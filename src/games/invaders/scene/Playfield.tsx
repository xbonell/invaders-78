import { useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Alien, AlienShotType, GameState } from '../game/types';
import type { MotionSnapshot } from '../motion/playerRender';
import { activeBoard } from '../game/board';
import { FORMATION, GROUND_LINE, PLAYER, UFO } from '../game/constants';
import { BunkerMesh } from './meshes/BunkerMesh';
import { GlowAlienShot } from './meshes/GlowAlienShot';
import { GlowBullet } from './meshes/GlowBullet';
import { RecipeMesh } from '../render/voxel/RecipeMesh';
import { ScoreFloatField } from './meshes/ScoreFloatField';
import { DebrisField } from '../render/voxel/DebrisField';
import { alienRecipe, PLAYER_RECIPE, ufoRecipe } from '../render/voxel/recipes';

const ALIEN_SHOT_TYPES: AlienShotType[] = ['rolling', 'plunger', 'squiggly'];

function SmoothPlayer({
  z,
  motionSnapshot,
}: {
  z: number;
  motionSnapshot: MutableRefObject<MotionSnapshot>;
}) {
  const group = useRef<THREE.Group>(null);

  const attach = (node: THREE.Group | null) => {
    group.current = node;
    if (!node) return;
    node.position.set(motionSnapshot.current.playerX, 0, z);
  };

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.x = motionSnapshot.current.playerX;
  });

  return (
    <group ref={attach}>
      <RecipeMesh recipe={PLAYER_RECIPE} />
    </group>
  );
}

function SmoothUfo({ motionSnapshot }: { motionSnapshot: MutableRefObject<MotionSnapshot> }) {
  const group = useRef<THREE.Group>(null);
  const frameRef = useRef<0 | 1 | 2>(0);
  const [animFrame, setAnimFrame] = useState<0 | 1 | 2>(0);

  const attach = (node: THREE.Group | null) => {
    group.current = node;
    if (!node) return;
    const s = motionSnapshot.current;
    node.visible = s.ufoVisible;
    node.position.set(s.ufoX, 0, UFO.z);
  };

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = motionSnapshot.current;
    g.visible = s.ufoVisible;
    if (!s.ufoVisible) return;
    g.position.x = s.ufoX;
    if (s.ufoAnimFrame !== frameRef.current) {
      frameRef.current = s.ufoAnimFrame;
      setAnimFrame(s.ufoAnimFrame);
    }
  });

  return (
    <group ref={attach}>
      <RecipeMesh recipe={ufoRecipe(animFrame)} />
    </group>
  );
}

/**
 * Formation pose via MotionSnapshot (parent snaps/lerps origin; local anim state).
 * Avoids remounting bunkers/playfield on every march step.
 */
function FormationAliens({
  aliens,
  motionSnapshot,
}: {
  aliens: Alien[];
  motionSnapshot: MutableRefObject<MotionSnapshot>;
}) {
  const group = useRef<THREE.Group>(null);
  const frameRef = useRef<0 | 1>(0);
  const [animFrame, setAnimFrame] = useState<0 | 1>(0);

  const attach = (node: THREE.Group | null) => {
    group.current = node;
    if (!node) return;
    const s = motionSnapshot.current;
    node.position.set(s.formationDispX, 0, s.formationDispZ);
  };

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = motionSnapshot.current;
    g.position.x = s.formationDispX;
    g.position.z = s.formationDispZ;
    if (s.formationAnimFrame !== frameRef.current) {
      frameRef.current = s.formationAnimFrame;
      setAnimFrame(s.formationAnimFrame);
    }
  });

  return (
    <group ref={attach}>
      {aliens.map((a) => (
        <group
          key={a.id}
          position={[a.col * FORMATION.colSpacing, 0.85, -a.row * FORMATION.rowSpacing]}
        >
          <RecipeMesh recipe={alienRecipe(a.type, animFrame)} />
        </group>
      ))}
    </group>
  );
}

export function Playfield({
  state,
  version,
  motionSnapshot,
}: {
  state: GameState;
  version: number;
  motionSnapshot: MutableRefObject<MotionSnapshot>;
}) {
  const board = activeBoard(state);
  // `version` forces rebuild when sim mutates aliens in place (kills / wave)
  const aliens = useMemo(
    () => board.aliens.filter((a) => a.alive),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- version tracks in-place sim mutations
    [board.aliens, version],
  );

  return (
    <group>
      <mesh position={[0, GROUND_LINE.y, PLAYER.z - GROUND_LINE.zOffset]}>
        <boxGeometry args={[GROUND_LINE.width, GROUND_LINE.y, GROUND_LINE.thickness]} />
        <meshLambertMaterial color="#22e35a" />
      </mesh>

      {board.player.alive && <SmoothPlayer z={board.player.z} motionSnapshot={motionSnapshot} />}

      {board.bunkers.map((b, i) => (
        <BunkerMesh key={i} bunker={b} />
      ))}

      {/* Above bunker stacks so formation stays visually in front when overlapping */}
      <FormationAliens aliens={aliens} motionSnapshot={motionSnapshot} />

      {/* Always mounted — visibility from snapshot avoids remount/origin flashes */}
      <GlowBullet fromPlayer motionSnapshot={motionSnapshot} />

      {ALIEN_SHOT_TYPES.map((type) => (
        <GlowAlienShot key={type} type={type} motionSnapshot={motionSnapshot} />
      ))}

      <SmoothUfo motionSnapshot={motionSnapshot} />

      <DebrisField />
      <ScoreFloatField />
    </group>
  );
}
