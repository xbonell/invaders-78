import * as THREE from 'three';
import { BACKDROP_FRAGMENT, BACKDROP_VERTEX } from './backdropShader';
import { retainBake, type BakeSlot } from './retainBake';

export type BakeResult = {
  url: string;
  dispose: () => void;
};

export type BakeOptions = {
  /** Output width in CSS pixels (capped). Default 1920. */
  width?: number;
  /** Output height in CSS pixels (capped). Default 1080. */
  height?: number;
};

const pageBake: BakeSlot<BakeResult> = { current: null };

/**
 * One bake per page load. Safe under React Strict Mode remounts — do not revoke
 * the blob while CSS still uses it.
 */
export function getPageBackdrop(opts: BakeOptions = {}): BakeResult {
  return retainBake(pageBake, () => bakeBackdrop(opts));
}

const MAX_W = 1920;
const MAX_H = 1080;

function canvasToBlobUrl(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/png');
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma);
  const mime = /data:(.*?);/.exec(header)?.[1] ?? 'image/png';
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/**
 * Render the arcade-flat planet/sky backdrop once into a canvas and return a
 * blob object URL for CSS `background-image`. Disposes all GL resources
 * immediately. Prefer `getPageBackdrop()` so Strict Mode does not revoke a
 * still-referenced blob.
 */
export function bakeBackdrop(opts: BakeOptions = {}): BakeResult {
  const width = Math.min(Math.max(1, Math.floor(opts.width ?? MAX_W)), MAX_W);
  const height = Math.min(Math.max(1, Math.floor(opts.height ?? MAX_H)), MAX_H);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 1);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: BACKDROP_VERTEX,
    fragmentShader: BACKDROP_FRAGMENT,
    uniforms: {
      uResolution: { value: new THREE.Vector2(width, height) },
      uHorizon: { value: 0.4 },
      // Align with playfield green accent language
      uPlanetNear: { value: new THREE.Color('#3d9a2e') },
      uPlanetFar: { value: new THREE.Color('#1a4a18') },
      uSkyTop: { value: new THREE.Color('#000000') },
      uSkyHorizon: { value: new THREE.Color('#050a14') },
      uNebula: { value: new THREE.Color('#1a3a4a') },
      uLimb: { value: new THREE.Color('#4a9ad4') },
      uCraterSeed: { value: 12.7 },
      uStarDensity: { value: 0.7 },
    },
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const scene = new THREE.Scene();
  scene.add(mesh);

  renderer.render(scene, camera);

  const url = canvasToBlobUrl(canvas);

  geometry.dispose();
  material.dispose();
  renderer.dispose();
  // Release the bake context so fragile GPUs (iOS / dual-GPU) don't starve the game canvas.
  renderer.forceContextLoss();

  return {
    url,
    dispose: () => {
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Apply a baked backdrop URL to an element as `--backdrop-url`.
 */
export function applyBackdropUrl(el: HTMLElement, url: string): void {
  el.style.setProperty('--backdrop-url', `url("${url}")`);
}
