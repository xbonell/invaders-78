/** Arcade-flat shell backdrop — matches voxel/graphic game language. */

export const BACKDROP_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const BACKDROP_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uHorizon;
uniform vec3 uPlanetNear;
uniform vec3 uPlanetFar;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uNebula;
uniform vec3 uLimb;
uniform float uCraterSeed;
uniform float uStarDensity;

float hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 planetCenter(float aspect) {
  return vec2(0.5 * aspect, uHorizon - 1.2);
}

float planetRadius(float aspect) {
  return 1.4 + 0.05 * aspect;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 uv = vec2(vUv.x * aspect, vUv.y);
  float px = 1.5 / max(uResolution.y, 1.0);

  vec2 pc = planetCenter(aspect);
  float pr = planetRadius(aspect);
  float dist = length(uv - pc);
  float onPlanet = 1.0 - step(pr, dist);

  // --- Sky: flat bands + hard stars ---
  float skyT = step(uHorizon, vUv.y);
  vec3 sky = mix(uSkyHorizon, uSkyTop, skyT);

  // Soft limb only (thin cyan atmosphere line)
  float outside = max(dist - pr, 0.0);
  float limb = exp(-outside * 90.0) * (1.0 - onPlanet);
  sky += uLimb * limb * 2.2;

  // Sparse hard star pixels (no glow blobs)
  float starDens = mix(100.0, 160.0, uStarDensity);
  vec2 starCell = floor(uv * starDens);
  float starRoll = hash2(starCell + uCraterSeed);
  float star = step(0.997 - uStarDensity * 0.004, starRoll);
  vec2 starUv = (starCell + 0.5) / starDens;
  float starDist = length(uv - starUv);
  star *= 1.0 - step(px * 1.2, starDist);
  sky += vec3(0.85, 0.9, 1.0) * star * (1.0 - onPlanet);

  // Very light side nebula — flat tint only, no wisps
  float side = (1.0 - smoothstep(0.0, 0.4, vUv.x)) + smoothstep(0.6, 1.0, vUv.x);
  sky += uNebula * side * 0.08 * (1.0 - onPlanet) * step(uHorizon, vUv.y);

  // --- Planet: flat two-tone lime disc ---
  vec3 planet = vec3(0.0);
  if (onPlanet > 0.5) {
    vec2 local = (uv - pc) / pr;
    float band = step(0.15, -local.y + (1.0 - length(local)) * 0.35);
    planet = mix(uPlanetFar, uPlanetNear, band);
  }

  vec3 col = mix(sky, planet, onPlanet);
  gl_FragColor = vec4(col, 1.0);
}
`;
