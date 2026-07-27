import { PLAYER, UFO } from './constants';
import { createAlienShotSystem, resetAlienShotSystemForWave } from './alienShots';
import { createAliens, createBunkers, createFormation } from './formation';
import type { BoardState, GameState } from './types';

export function activeBoard(state: GameState): BoardState {
  return state.boards[state.activePlayer];
}

/** Empty board shell; call `resetBoardWave` before play. */
export function createEmptyBoard(): BoardState {
  return {
    wave: 1,
    player: { x: 0, z: PLAYER.z, alive: true },
    aliens: [],
    formation: createFormation(1),
    playerBullet: null,
    alienShots: createAlienShotSystem(),
    bunkers: [],
    ufo: null,
    ufoSpawnTimer: UFO.spawnInterval * 0.5,
    alienHitFreezeTimer: 0,
  };
}

export function resetBoardWave(board: BoardState, wave: number): void {
  board.wave = wave;
  board.aliens = createAliens();
  board.formation = createFormation(wave);
  board.playerBullet = null;
  resetAlienShotSystemForWave(board.alienShots);
  board.bunkers = createBunkers();
  board.ufo = null;
  board.ufoSpawnTimer = UFO.spawnInterval;
  board.alienHitFreezeTimer = 0;
  board.player.x = 0;
  board.player.z = PLAYER.z;
  board.player.alive = true;
}
