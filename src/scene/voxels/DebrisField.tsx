import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUNKER } from '../../game/constants';
import type { GameEvent } from '../../game/types';
import { drainFxQueue } from './fxQueue';
import {
  alienRecipe,
  BUNKER_COLOR,
  PLAYER_RECIPE,
  recipeToBits,
  UFO_RECIPE,
  type VoxelBit,
} from './recipes';

const MAX_DEBRIS = 320;
const LIFE = 0.55;

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  rot: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

function claimSlot(pool: Particle[]): Particle {
  const free = pool.find((p) => !p.active);
  if (free) return free;
  let oldest = pool[0]!;
  for (const p of pool) {
    if (p.life < oldest.life) oldest = p;
  }
  return oldest;
}

function spawnFromBits(
  pool: Particle[],
  originX: number,
  originZ: number,
  bits: VoxelBit[],
  colorOverride?: string,
): void {
  for (const bit of bits) {
    const slot = claimSlot(pool);
    const speed = 2.5 + Math.random() * 5;
    const angle = Math.random() * Math.PI * 2;
    const maxLife = LIFE * (0.7 + Math.random() * 0.3);
    slot.active = true;
    slot.x = originX + bit.x;
    slot.y = bit.y;
    slot.z = originZ + bit.z;
    slot.vx = Math.cos(angle) * speed * (0.4 + Math.random());
    slot.vy = 3 + Math.random() * 5;
    slot.vz = Math.sin(angle) * speed * (0.4 + Math.random());
    slot.spin = (Math.random() - 0.5) * 14;
    slot.rot = Math.random() * Math.PI;
    slot.life = maxLife;
    slot.maxLife = maxLife;
    slot.size = bit.size;
    slot.color.set(colorOverride ?? bit.color);
  }
}

function bunkerCellBits(): VoxelBit[] {
  const s = BUNKER.cellSize * 0.9;
  const h = BUNKER.stackSize * 1.35;
  return [
    { x: 0, y: h * 0.5, z: 0, size: s, color: BUNKER_COLOR },
    { x: 0, y: h * 1.35, z: 0, size: s * 0.85, color: BUNKER_COLOR },
  ];
}

/** Hot orange glow for squid / crab / octopus debris */
const ALIEN_DEBRIS_GLOW = '#ff7a18';

function spawnForEvent(pool: Particle[], e: GameEvent): void {
  if (e.type === 'alienHit') {
    spawnFromBits(
      pool,
      e.x,
      e.z,
      recipeToBits(alienRecipe(e.alienType, e.animFrame)),
      ALIEN_DEBRIS_GLOW,
    );
  } else if (e.type === 'ufoHit') {
    spawnFromBits(pool, e.x, e.z, recipeToBits(UFO_RECIPE));
  } else if (e.type === 'playerHit') {
    spawnFromBits(pool, e.x, e.z, recipeToBits(PLAYER_RECIPE));
  } else if (e.type === 'bunkerHit') {
    spawnFromBits(pool, e.x, e.z, bunkerCellBits());
  }
}

export function DebrisField() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pool = useRef<Particle[]>([]);
  const dummy = useRef(new THREE.Object3D());
  const color = useRef(new THREE.Color());

  if (pool.current.length === 0) {
    pool.current = Array.from({ length: MAX_DEBRIS }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      rot: 0,
      life: 0,
      maxLife: LIFE,
      size: 0.1,
      color: new THREE.Color('#fff'),
    }));
  }

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < MAX_DEBRIS; i++) {
      mesh.setColorAt(i, new THREE.Color('#ffffff'));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame((_, dt) => {
    for (const e of drainFxQueue()) {
      spawnForEvent(pool.current, e);
    }

    const mesh = meshRef.current;
    if (!mesh) return;

    let i = 0;
    for (const p of pool.current) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy -= 18 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rot += p.spin * dt;
      if (p.y < 0.05) {
        p.y = 0.05;
        p.vy *= -0.25;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }

      const t = Math.max(0, p.life / p.maxLife);
      dummy.current.position.set(p.x, p.y, p.z);
      dummy.current.rotation.set(p.rot, p.rot * 0.7, p.rot * 1.3);
      // Shrink while fading
      dummy.current.scale.setScalar(p.size * (0.4 + 0.6 * t));
      dummy.current.updateMatrix();
      mesh.setMatrixAt(i, dummy.current.matrix);
      // Bright additive glow that dims to black (fade away)
      color.current.copy(p.color).multiplyScalar(0.55 + 1.1 * t);
      mesh.setColorAt(i, color.current);
      i++;
    }
    for (; i < MAX_DEBRIS; i++) {
      dummy.current.position.set(0, -10, 0);
      dummy.current.scale.setScalar(0);
      dummy.current.updateMatrix();
      mesh.setMatrixAt(i, dummy.current.matrix);
      color.current.setRGB(0, 0, 0);
      mesh.setColorAt(i, color.current);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_DEBRIS]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        toneMapped={false}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.9}
      />
    </instancedMesh>
  );
}
