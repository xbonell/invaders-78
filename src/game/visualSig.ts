import type { GameState } from './types';
import { allAlienShotSlots } from './alienShots';
import { activeBoard } from './board';

/**
 * Discrete visual fingerprint for React re-render gating.
 * Omits continuous motion (player/UFO/bullet/shot world positions) — those
 * live in MotionSnapshot and must not force Playfield reconciliation.
 */
export function visualSig(state: GameState): string {
  const board = activeBoard(state);
  let alive = 0;
  let aliveBits = 0;
  for (const a of board.aliens) {
    if (!a.alive) continue;
    alive += 1;
    aliveBits = (aliveBits + (a.id + 1) * 17) | 0;
  }

  let bunkerSolid = 0;
  for (const b of board.bunkers) {
    for (const c of b.cells) bunkerSolid += c;
  }

  const shots = allAlienShotSlots(board.alienShots)
    .map((s) => (s.state === 'idle' ? '' : `${s.type[0]}${s.state[0]}${s.animationFrame}`))
    .join('');

  return [
    state.phase,
    state.attractScreen,
    state.activePlayer,
    state.playerCount,
    board.player.alive ? 1 : 0,
    state.scores[0],
    state.scores[1],
    state.highScore,
    state.livesByPlayer[0],
    state.livesByPlayer[1],
    board.wave,
    board.formation.originX,
    board.formation.originZ,
    board.formation.animFrame,
    board.ufo ? `1${board.ufo.animFrame}` : '',
    board.playerBullet ? 1 : 0,
    alive,
    aliveBits,
    bunkerSolid,
    shots,
  ].join('|');
}
