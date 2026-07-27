import type { GameState } from './types';
import { allAlienShotSlots } from './alienShots';

/**
 * Discrete visual fingerprint for React re-render gating.
 * Omits continuous motion (player/UFO/bullet/shot world positions) — those
 * live in MotionSnapshot and must not force Playfield reconciliation.
 */
export function visualSig(state: GameState): string {
  let alive = 0;
  let aliveBits = 0;
  for (const a of state.aliens) {
    if (!a.alive) continue;
    alive += 1;
    aliveBits = (aliveBits + (a.id + 1) * 17) | 0;
  }

  let bunkerSolid = 0;
  for (const b of state.bunkers) {
    for (const c of b.cells) bunkerSolid += c;
  }

  const shots = allAlienShotSlots(state.alienShots)
    .map((s) => (s.state === 'idle' ? '' : `${s.type[0]}${s.state[0]}${s.animationFrame}`))
    .join('');

  return [
    state.phase,
    state.attractScreen,
    state.activePlayer,
    state.playerCount,
    state.player.alive ? 1 : 0,
    state.scores[0],
    state.scores[1],
    state.highScore,
    state.livesByPlayer[0],
    state.livesByPlayer[1],
    state.wave,
    state.formation.originX,
    state.formation.originZ,
    state.formation.animFrame,
    state.ufo ? `1${state.ufo.animFrame}` : '',
    state.playerBullet ? 1 : 0,
    alive,
    aliveBits,
    bunkerSolid,
    shots,
  ].join('|');
}
