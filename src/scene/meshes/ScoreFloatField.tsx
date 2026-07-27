import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VOXEL_SIZE } from '../../game/constants';
import { drainScoreFloatQueue, type ScoreFloatSpawn } from '../voxels/scoreFloatQueue';

const POOL = 4;
const LIFE = 0.6;
const RISE_SPEED = 3.2;
const PLANE_H = VOXEL_SIZE * 5;
const TEX_W = 256;
const TEX_H = 96;
const PLANE_ASPECT = TEX_W / TEX_H;

interface FloatSlot {
  active: boolean;
  x: number;
  z: number;
  y: number;
  life: number;
  maxLife: number;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  mesh: THREE.Mesh | null;
  material: THREE.MeshBasicMaterial | null;
}

function makeSlot(): FloatSlot {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  // Top-down ortho (camera up = +Z): camera right is world -X, and default
  // flipY maps canvas top to screen-bottom — both corrected in paintScore.
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return {
    active: false,
    x: 0,
    z: 0,
    y: VOXEL_SIZE * 2,
    life: 0,
    maxLife: LIFE,
    texture,
    canvas,
    ctx,
    mesh: null,
    material: null,
  };
}

function paintScore(slot: FloatSlot, points: number): void {
  const { ctx, canvas, texture } = slot;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  // Mirror X: camera.right = -X with up=+Z, so plane +U reads screen-left.
  ctx.translate(w / 2, h / 2);
  ctx.scale(-1, 1);
  ctx.fillStyle = '#f5f5f5';
  ctx.font = `bold ${Math.floor(h * 0.55)}px 'Press Start 2P', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(points), 0, 0);
  ctx.restore();
  texture.needsUpdate = true;
}

function claimSlot(pool: FloatSlot[]): FloatSlot {
  const free = pool.find((s) => !s.active);
  if (free) return free;
  let oldest = pool[0];
  for (const s of pool) {
    if (s.life < oldest.life) oldest = s;
  }
  return oldest;
}

function spawnFloat(pool: FloatSlot[], spawn: ScoreFloatSpawn): void {
  const slot = claimSlot(pool);
  paintScore(slot, spawn.points);
  slot.active = true;
  slot.x = spawn.x;
  slot.z = spawn.z;
  slot.y = VOXEL_SIZE * 2;
  slot.maxLife = LIFE;
  slot.life = LIFE;
}

function attachMesh(slot: FloatSlot, node: THREE.Mesh | null): void {
  slot.mesh = node;
  if (!node) return;
  if (!slot.material) {
    slot.material = new THREE.MeshBasicMaterial({
      map: slot.texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      opacity: 0,
      side: THREE.DoubleSide,
    });
  }
  node.material = slot.material;
  node.visible = false;
  // Plane default faces +Z; rotate to lie in XZ (normal +Y) so ortho top-down reads it.
  node.rotation.set(-Math.PI / 2, 0, 0);
  node.scale.set(PLANE_H * PLANE_ASPECT, PLANE_H, 1);
  node.renderOrder = 10;
}

/** World-space UFO points popup: rises +Z and fades out immediately. */
export function ScoreFloatField() {
  const poolRef = useRef<FloatSlot[]>([]);

  if (poolRef.current.length === 0) {
    poolRef.current = Array.from({ length: POOL }, () => makeSlot());
  }

  useFrame((_, dt) => {
    for (const spawn of drainScoreFloatQueue()) {
      spawnFloat(poolRef.current, spawn);
    }

    for (const slot of poolRef.current) {
      const mesh = slot.mesh;
      const mat = slot.material;
      if (!mesh || !mat) continue;

      if (!slot.active) {
        mesh.visible = false;
        continue;
      }

      slot.life -= dt;
      if (slot.life <= 0) {
        slot.active = false;
        mesh.visible = false;
        continue;
      }

      slot.z += RISE_SPEED * dt;
      const t = Math.max(0, slot.life / slot.maxLife);
      mesh.visible = true;
      mesh.position.set(slot.x, slot.y, slot.z);
      mat.opacity = t;
    }
  });

  return (
    <group>
      {poolRef.current.map((slot, i) => (
        <mesh
          key={i}
          frustumCulled={false}
          ref={(node) => {
            attachMesh(slot, node);
          }}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}
