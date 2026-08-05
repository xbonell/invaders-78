import { ALIEN_POINTS, ATTRACT } from './constants';
import { shotBlockedByBunker } from './collisions';
import { alienWorldPos } from './formation';
import type { Alien, Bunker, FormationState, Ufo } from './types';

export type DemoAim = {
  /** World X to chase / line up on */
  aimX: number;
  /** Target world Z (for bunker LOS) */
  targetZ: number;
  /** True when a live target exists */
  found: boolean;
};

type Candidate = {
  aimX: number;
  targetZ: number;
  score: number;
  blocked: boolean;
};

/**
 * Prefer clear shot lanes. UFO if unblocked; else highest value with nearer-X
 * as tiebreak. Falls back to a blocked target only when no clear shot exists.
 */
export function pickDemoAim(
  aliens: Alien[],
  formation: FormationState,
  playerX: number,
  playerZ: number,
  ufo: Ufo | null,
  bunkers: Bunker[],
  lead = ATTRACT.demoLead,
): DemoAim {
  const candidates: Candidate[] = [];

  if (ufo) {
    candidates.push({
      aimX: ufo.x,
      targetZ: ufo.z,
      score: 10_000 - Math.abs(ufo.x - playerX),
      blocked: shotBlockedByBunker(bunkers, ufo.x, playerZ, ufo.z),
    });
  }

  for (const a of aliens) {
    if (!a.alive) continue;
    const p = alienWorldPos(a, formation);
    const aimX = p.x + formation.dir * lead;
    const points = ALIEN_POINTS[a.type] ?? 10;
    candidates.push({
      aimX,
      targetZ: p.z,
      score: points * 10 - Math.abs(p.x - playerX),
      blocked: shotBlockedByBunker(bunkers, aimX, playerZ, p.z),
    });
  }

  if (candidates.length === 0) {
    return { aimX: 0, targetZ: playerZ, found: false };
  }

  const clear = candidates.filter((c) => !c.blocked);
  const pool = clear.length > 0 ? clear : candidates;
  let best = pool[0];
  for (let i = 1; i < pool.length; i++) {
    const c = pool[i];
    if (c.score > best.score) best = c;
  }

  return { aimX: best.aimX, targetZ: best.targetZ, found: true };
}

export function demoMoveDir(
  playerX: number,
  aimX: number,
  deadzone = ATTRACT.demoMoveDeadzone,
): -1 | 0 | 1 {
  const dx = aimX - playerX;
  if (dx < -deadzone) return -1;
  if (dx > deadzone) return 1;
  return 0;
}

export function demoShouldFire(
  playerX: number,
  aimX: number,
  targetZ: number,
  playerZ: number,
  bunkers: Bunker[],
  hasBullet: boolean,
  fireCooldownReady: boolean,
  alignTol = ATTRACT.demoAlignTol,
): boolean {
  if (!fireCooldownReady || hasBullet) return false;
  if (Math.abs(playerX - aimX) >= alignTol) return false;
  if (shotBlockedByBunker(bunkers, playerX, playerZ, targetZ)) return false;
  return true;
}
