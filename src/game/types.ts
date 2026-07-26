/** Shared game types for the pure simulation. */

export type GamePhase =
  | 'attract'
  | 'ready'
  | 'playing'
  | 'waveClear'
  | 'dying'
  | 'playerSwitch'
  | 'gameOver'
  | 'paused';

export type AlienType = 'squid' | 'crab' | 'octopus';

export interface Vec2 {
  x: number;
  z: number;
}

export interface Alien {
  id: number;
  col: number;
  row: number;
  type: AlienType;
  alive: boolean;
}

export interface Bullet {
  x: number;
  z: number;
  vz: number;
  fromPlayer: boolean;
}

export interface Bunker {
  x: number;
  z: number;
  /** row-major; 1 = solid cell */
  cells: number[];
  cols: number;
  rows: number;
}

export interface Ufo {
  x: number;
  z: number;
  vx: number;
  scoreIndex: number;
}

export type GameEvent =
  | { type: 'shoot' }
  | {
      type: 'alienHit';
      points: number;
      x: number;
      z: number;
      alienType: AlienType;
      animFrame: 0 | 1;
    }
  | { type: 'ufoHit'; points: number; x: number; z: number }
  | { type: 'playerHit'; x: number; z: number }
  | { type: 'bunkerHit'; x: number; z: number }
  | { type: 'formationStep'; note: number }
  | { type: 'ufoSpawn' }
  | { type: 'ufoDespawn' }
  | { type: 'waveClear' }
  | { type: 'playerSwitch'; player: 1 | 2 }
  | { type: 'gameOver' };

export interface PlayerState {
  x: number;
  z: number;
  alive: boolean;
}

export interface FormationState {
  originX: number;
  originZ: number;
  dir: 1 | -1;
  stepTimer: number;
  stepInterval: number;
  animFrame: 0 | 1;
  marchNote: number;
}

export interface GameState {
  phase: GamePhase;
  /** Active player's score (mirrors scores[activePlayer]) */
  score: number;
  scores: [number, number];
  highScore: number;
  /** Active player's lives */
  lives: number;
  livesByPlayer: [number, number];
  wave: number;
  playerCount: 1 | 2;
  /** 0 = player 1, 1 = player 2 */
  activePlayer: 0 | 1;
  player: PlayerState;
  aliens: Alien[];
  formation: FormationState;
  playerBullet: Bullet | null;
  alienBullets: Bullet[];
  bunkers: Bunker[];
  ufo: Ufo | null;
  ufoSpawnTimer: number;
  dyingTimer: number;
  waveClearTimer: number;
  gameOverTimer: number;
  switchTimer: number;
  attractTimer: number;
  /** 0 = title, 1 = score table */
  attractScreen: 0 | 1;
  alienShootTimer: number;
  events: GameEvent[];
  shotCount: number;
  shotCounts: [number, number];
  credits: number;
}

export type GameCommand =
  | { type: 'start' }
  | { type: 'startTwo' }
  | { type: 'restart' }
  | { type: 'credit' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'move'; dir: -1 | 0 | 1 }
  | { type: 'fire' };
