import {
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AlienShotType, GameState } from '../game/types';
import type { MotionSnapshot } from '../game/playerRender';
import { GROUND_LINE, PLAYER, PLAYFIELD, UFO } from '../game/constants';
import { alienWorldPos } from '../game/formation';
import { BunkerMesh } from './meshes/BunkerMesh';
import { GlowAlienShot } from './meshes/GlowAlienShot';
import { GlowBullet } from './meshes/GlowBullet';
import { RecipeMesh } from './voxels/RecipeMesh';
import { DebrisField } from './voxels/DebrisField';
import {
  alienRecipe,
  PLAYER_RECIPE,
  UFO_RECIPE,
} from './voxels/recipes';

const ALIEN_SHOT_TYPES: AlienShotType[] = ['rolling', 'plunger', 'squiggly'];

/** Runs before mesh useFrames so snapshot matches this display frame. */
export function GameSimDriver({
  advanceRef,
}: {
  advanceRef: RefObject<(now: number) => void>;
}) {
  useFrame(() => {
    advanceRef.current?.(performance.now());
  }, -1);
  return null;
}

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

function SmoothUfo({
  motionSnapshot,
}: {
  motionSnapshot: MutableRefObject<MotionSnapshot>;
}) {
  const group = useRef<THREE.Group>(null);

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
  });

  return (
    <group ref={attach}>
      <RecipeMesh recipe={UFO_RECIPE} />
    </group>
  );
}

/** Offsets sim-relative aliens so invasion fly-off can lerp display origin. */
function InvasionAlienOffset({
  motionSnapshot,
  children,
}: {
  motionSnapshot: MutableRefObject<MotionSnapshot>;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = motionSnapshot.current;
    if (s.invasionSmooth) {
      g.position.x = s.formationDispX - s.formationSimX;
      g.position.z = s.formationDispZ - s.formationSimZ;
    } else {
      g.position.x = 0;
      g.position.z = 0;
    }
  });

  return <group ref={group}>{children}</group>;
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
        <SmoothPlayer z={state.player.z} motionSnapshot={motionSnapshot} />
      )}

      {state.bunkers.map((b, i) => (
        <BunkerMesh key={i} bunker={b} />
      ))}

      {/* Above bunker stacks so formation stays visually in front when overlapping */}
      <InvasionAlienOffset motionSnapshot={motionSnapshot}>
        {aliens.map(({ a, p }) => (
          <group key={a.id} position={[p.x, 0.85, p.z]}>
            <RecipeMesh
              recipe={alienRecipe(a.type, state.formation.animFrame)}
            />
          </group>
        ))}
      </InvasionAlienOffset>

      {/* Always mounted — visibility from snapshot avoids remount/origin flashes */}
      <GlowBullet fromPlayer motionSnapshot={motionSnapshot} />

      {ALIEN_SHOT_TYPES.map((type) => (
        <GlowAlienShot
          key={type}
          type={type}
          frame={state.alienShots[type].animationFrame}
          motionSnapshot={motionSnapshot}
        />
      ))}

      <SmoothUfo motionSnapshot={motionSnapshot} />

      <DebrisField />
    </group>
  );
}

export function OrthoCameraRig() {
  const lastAspect = useRef(0);
  useFrame(({ camera, size }) => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const aspect = size.width / Math.max(size.height, 1);
    if (Math.abs(aspect - lastAspect.current) < 1e-6) return;
    lastAspect.current = aspect;
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
