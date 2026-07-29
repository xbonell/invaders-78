import {
  ALIEN_POINTS,
  ALIEN_SHOT,
  ATTRACT,
  FORMATION,
  HIT,
  PLAYER,
  PLAYFIELD,
  UFO,
  playerMaxAbsX,
  ufoOffscreenAbsX,
} from './constants';
import { bulletHitsPoint, erodeBunkerAt } from './collisions';
import {
  alienShotContextFromGameState,
  clearAlienShots,
  injectAlienShotAtPlayer,
  updateAlienShots,
} from './alienShots';
import { activeBoard, createEmptyBoard, resetBoardWave } from './board';
import {
  alienWorldPos,
  aliveCount,
  formationStepX,
  formationWouldHitEdge,
  stepIntervalForCount,
} from './formation';
import { demoMoveDir, demoShouldFire, pickDemoAim } from './demoAi';
import type { Alien, BoardState, GameCommand, GameEvent, GameState, Ufo } from './types';

export { injectAlienShotAtPlayer, activeBoard };

export interface Game {
  state: GameState;
  moveDir: -1 | 0 | 1;
  fireQueued: boolean;
  demoFireTimer: number;
  getAlienWorldPos: (alien: Alien) => { x: number; z: number };
}

function emptyEvents(): GameEvent[] {
  return [];
}

function syncActive(state: GameState): void {
  const i = state.activePlayer;
  state.score = state.scores[i]!;
  state.lives = state.livesByPlayer[i]!;
  state.shotCount = state.shotCounts[i]!;
}

function addScore(state: GameState, points: number): void {
  const i = state.activePlayer;
  const before = state.scores[i];
  state.scores[i] = before + points;
  state.score = state.scores[i]!;
  state.highScore = Math.max(state.highScore, state.scores[0], state.scores[1]);
  if (
    !state.bonusLifeAwarded[i] &&
    before < PLAYER.bonusLifeAt &&
    state.scores[i] >= PLAYER.bonusLifeAt
  ) {
    state.bonusLifeAwarded[i] = true;
    state.livesByPlayer[i] = state.livesByPlayer[i] + 1;
    state.lives = state.livesByPlayer[i]!;
  }
}

function startWave(board: BoardState, wave: number): void {
  resetBoardWave(board, wave);
}

function enterAttract(state: GameState): void {
  state.scores = [0, 0];
  state.livesByPlayer = [PLAYER.startLives, PLAYER.startLives];
  state.activePlayer = 0;
  state.playerCount = 1;
  state.menuPlayerCount = 1;
  state.shotCounts = [0, 0];
  state.bonusLifeAwarded = [false, false];
  state.attractTimer = ATTRACT.screenDuration;
  state.attractScreen = ATTRACT.enabledScreens[0] ?? 'info';
  state.gameOverTimer = 0;
  state.switchTimer = 0;
  startWave(activeBoard(state), 1);
  state.phase = 'attract';
  syncActive(state);
}

function baseState(highScore: number): GameState {
  const boards: [BoardState, BoardState] = [createEmptyBoard(), createEmptyBoard()];
  const state: GameState = {
    phase: 'attract',
    score: 0,
    scores: [0, 0],
    highScore,
    lives: PLAYER.startLives,
    livesByPlayer: [PLAYER.startLives, PLAYER.startLives],
    playerCount: 1,
    menuPlayerCount: 1,
    activePlayer: 0,
    boards,
    dyingTimer: 0,
    waveClearTimer: 0,
    gameOverTimer: 0,
    switchTimer: 0,
    attractTimer: ATTRACT.screenDuration,
    attractScreen: ATTRACT.enabledScreens[0] ?? 'info',
    events: emptyEvents(),
    shotCount: 0,
    shotCounts: [0, 0],
    bonusLifeAwarded: [false, false],
  };
  startWave(activeBoard(state), 1);
  state.phase = 'attract';
  syncActive(state);
  return state;
}

export function createGame(highScore = 0): Game {
  const state = baseState(highScore);
  const game: Game = {
    state,
    moveDir: 0,
    fireQueued: false,
    demoFireTimer: ATTRACT.demoFireCooldown,
    getAlienWorldPos: (alien) => alienWorldPos(alien, activeBoard(game.state).formation),
  };
  return game;
}

export function drainEvents(game: Game): GameEvent[] {
  const ev = game.state.events;
  game.state.events = emptyEvents();
  return ev;
}

function pushEvent(state: GameState, event: GameEvent): void {
  state.events.push(event);
}

function beginPlay(game: Game, playerCount: 1 | 2): void {
  const { state } = game;
  // Drop attract-demo / game-over / held-key leftovers (same idea as death clear)
  game.moveDir = 0;
  game.fireQueued = false;
  state.playerCount = playerCount;
  state.activePlayer = 0;
  state.scores = [0, 0];
  state.livesByPlayer = [PLAYER.startLives, playerCount === 2 ? PLAYER.startLives : 0];
  state.shotCounts = [0, 0];
  state.bonusLifeAwarded = [false, false];
  startWave(state.boards[0], 1);
  if (playerCount === 2) {
    startWave(state.boards[1], 1);
  } else {
    resetBoardWave(state.boards[1], 1);
  }
  state.phase = 'playing';
  syncActive(state);
}

export function dispatch(game: Game, cmd: GameCommand): void {
  const { state } = game;
  switch (cmd.type) {
    case 'start':
      if (state.phase === 'attract' || state.phase === 'ready' || state.phase === 'gameOver') {
        beginPlay(game, 1);
      }
      break;
    case 'startTwo':
      if (state.phase === 'attract' || state.phase === 'ready' || state.phase === 'gameOver') {
        beginPlay(game, 2);
      }
      break;
    case 'confirmStart':
      if (state.phase === 'attract' || state.phase === 'ready' || state.phase === 'gameOver') {
        beginPlay(game, state.menuPlayerCount);
      }
      break;
    case 'menuSelect':
      if (state.phase === 'attract' || state.phase === 'ready' || state.phase === 'gameOver') {
        const idx = state.menuPlayerCount - 1;
        const next = (idx + cmd.dir + 2) % 2;
        state.menuPlayerCount = next === 0 ? 1 : 2;
        if (state.phase === 'attract') {
          state.attractScreen = 'info';
          state.attractTimer = ATTRACT.screenDuration;
        }
      }
      break;
    case 'restart':
      beginPlay(game, state.playerCount);
      break;
    case 'pause':
      if (state.phase === 'playing') state.phase = 'paused';
      break;
    case 'resume':
      if (state.phase === 'paused') state.phase = 'playing';
      break;
    case 'move':
      // Always track stick/keys so releases during dying/pause clear direction
      game.moveDir = cmd.dir;
      break;
    case 'fire':
      if (state.phase === 'playing') {
        game.fireQueued = true;
        tryPlayerFire(game);
      }
      break;
  }
}

function tryPlayerFire(game: Game): void {
  if (!game.fireQueued) return;
  game.fireQueued = false;
  const { state } = game;
  const board = activeBoard(state);
  if ((state.phase !== 'playing' && state.phase !== 'attract') || !board.player.alive) {
    return;
  }
  if (board.playerBullet) return;
  board.playerBullet = {
    x: board.player.x,
    z: board.player.z + PLAYER.bulletSpawnOffsetZ,
    vz: PLAYER.bulletSpeed,
    fromPlayer: true,
  };
  if (state.phase === 'playing') {
    pushEvent(state, { type: 'shoot' });
  }
}

/** Advance UFO score/direction counters when a player shot leaves play (ROM semantics). */
function onPlayerShotRemoved(state: GameState): void {
  if (state.phase !== 'playing' && state.phase !== 'attract') return;
  const i = state.activePlayer;
  state.shotCounts[i] = state.shotCounts[i] + 1;
  state.shotCount = state.shotCounts[i]!;
}

function clearPlayerBullet(state: GameState): void {
  const board = activeBoard(state);
  if (!board.playerBullet) return;
  board.playerBullet = null;
  onPlayerShotRemoved(state);
}

function updatePlayer(game: Game, dt: number): void {
  const board = activeBoard(game.state);
  if (!board.player.alive) return;
  board.player.x += game.moveDir * PLAYER.speed * dt;
  const max = playerMaxAbsX();
  board.player.x = Math.max(-max, Math.min(max, board.player.x));
}

function stepFormation(game: Game, dt: number, emitAudio: boolean): void {
  const { state } = game;
  const board = activeBoard(state);
  const alive = aliveCount(board.aliens);
  if (alive === 0) return;

  board.formation.stepInterval = stepIntervalForCount(alive, board.wave);
  board.formation.stepTimer += dt;
  if (board.formation.stepTimer < board.formation.stepInterval) return;
  board.formation.stepTimer = 0;

  const stepX = formationStepX(alive, board.formation.dir);
  if (formationWouldHitEdge(board.aliens, board.formation, stepX)) {
    board.formation.dir = board.formation.dir === 1 ? -1 : 1;
    board.formation.originZ -= FORMATION.dropZ;
  } else {
    board.formation.originX += board.formation.dir * stepX;
  }

  board.formation.animFrame = board.formation.animFrame === 0 ? 1 : 0;
  const note = board.formation.marchNote % 4;
  board.formation.marchNote = (board.formation.marchNote + 1) % 4;
  if (emitAudio) {
    pushEvent(state, { type: 'formationStep', note });
  }

  if (state.phase === 'attract') {
    for (const a of board.aliens) {
      if (!a.alive) continue;
      const p = alienWorldPos(a, board.formation);
      if (p.z <= PLAYER.z + 2.5) {
        startWave(board, 1);
        state.phase = 'attract';
        return;
      }
    }
    return;
  }

  for (const a of board.aliens) {
    if (!a.alive) continue;
    const p = alienWorldPos(a, board.formation);
    if (p.z <= PLAYER.z + 0.8) {
      beginInvasion(game);
      return;
    }
  }
}

/** Aliens reached the player line: ship explodes, formation flies off, then resolve turn. */
function beginInvasion(game: Game): void {
  const { state } = game;
  if (state.phase !== 'playing') return;
  const board = activeBoard(state);
  const px = board.player.x;
  const pz = board.player.z;
  board.player.alive = false;
  if (board.playerBullet) clearPlayerBullet(state);
  clearAlienShots(board.alienShots);
  board.ufo = null;
  board.alienHitFreezeTimer = 0;
  game.moveDir = 0;
  game.fireQueued = false;
  const i = state.activePlayer;
  state.livesByPlayer[i] = 0;
  syncActive(state);
  state.phase = 'invasion';
  state.dyingTimer = FORMATION.invasionDuration;
  pushEvent(state, { type: 'playerHit', x: px, z: pz });
}

function updateInvasion(game: Game, dt: number): void {
  const { state } = game;
  const board = activeBoard(state);
  board.formation.originZ -= FORMATION.invasionFlySpeed * dt;
  state.dyingTimer -= dt;

  if (state.dyingTimer <= 0) {
    resolveAfterDeath(game);
  }
}

function mysteryScoreIndex(shotCount: number): number {
  return shotCount % UFO.scoreTable.length;
}

function spawnUfo(state: GameState): void {
  const board = activeBoard(state);
  if (board.ufo) return;
  if (aliveCount(board.aliens) < UFO.minAliensToSpawn) return;
  // Odd completed-shot count → from left (ROM LSB of shot counter)
  const fromLeft = (state.shotCount & 1) === 1;
  const index = mysteryScoreIndex(state.shotCount);
  const off = ufoOffscreenAbsX();
  board.ufo = {
    x: fromLeft ? -off : off,
    z: UFO.z,
    vx: fromLeft ? UFO.speed : -UFO.speed,
    scoreIndex: index,
    animFrame: 0,
    animTicks: 0,
  };
  pushEvent(state, { type: 'ufoSpawn' });
}

function updateUfo(state: GameState, dt: number): void {
  const board = activeBoard(state);
  board.ufoSpawnTimer -= dt;
  if (board.ufoSpawnTimer <= 0) {
    board.ufoSpawnTimer = UFO.spawnInterval;
    spawnUfo(state);
  }
  if (!board.ufo) return;
  board.ufo.x += board.ufo.vx * dt;
  const off = ufoOffscreenAbsX();
  // Scroll fully past the far rim before despawn (stay shootable while partially visible)
  if (board.ufo.vx > 0 && board.ufo.x >= off) {
    board.ufo = null;
    pushEvent(state, { type: 'ufoDespawn' });
    return;
  }
  if (board.ufo.vx < 0 && board.ufo.x <= -off) {
    board.ufo = null;
    pushEvent(state, { type: 'ufoDespawn' });
    return;
  }

  board.ufo.animTicks += 1;
  while (board.ufo.animTicks >= UFO.animIntervalTicks) {
    board.ufo.animTicks -= UFO.animIntervalTicks;
    const stepDir = board.ufo.vx > 0 ? 1 : 2;
    const nextFrame = (board.ufo.animFrame + stepDir) % 3;
    board.ufo.animFrame = nextFrame === 0 ? 0 : nextFrame === 1 ? 1 : 2;
  }
}

function collidePlayerBullet(state: GameState, scoring: boolean): void {
  const board = activeBoard(state);
  const b = board.playerBullet;
  if (!b) return;

  for (const bunker of board.bunkers) {
    if (erodeBunkerAt(bunker, b)) {
      clearPlayerBullet(state);
      // Always emit FX (attract demo kills need explosions too)
      pushEvent(state, { type: 'bunkerHit', x: b.x, z: b.z });
      return;
    }
  }

  if (board.ufo) {
    if (bulletHitsPoint(b, board.ufo.x, board.ufo.z, UFO.halfWidth, UFO.halfDepth)) {
      const ux = board.ufo.x;
      const uz = board.ufo.z;
      const animFrame = board.ufo.animFrame;
      // Score from current pointer at hit (ROM); then shot removal advances it
      const index = mysteryScoreIndex(state.shotCount);
      const points = scoring ? UFO.scoreTable[index] : 0;
      if (scoring) addScore(state, points);
      pushEvent(state, { type: 'ufoHit', points, x: ux, z: uz, animFrame });
      board.ufo = null;
      clearPlayerBullet(state);
      return;
    }
  }

  for (const alien of board.aliens) {
    if (!alien.alive) continue;
    const p = alienWorldPos(alien, board.formation);
    if (bulletHitsPoint(b, p.x, p.z, HIT.alienHalfW, HIT.alienHalfD)) {
      alien.alive = false;
      clearPlayerBullet(state);
      const points = scoring ? (ALIEN_POINTS[alien.type] ?? 10) : 0;
      if (scoring) addScore(state, points);
      if (scoring) {
        board.alienHitFreezeTimer = FORMATION.alienHitFreeze;
      }
      pushEvent(state, {
        type: 'alienHit',
        points,
        x: p.x,
        z: p.z,
        alienType: alien.type,
        animFrame: board.formation.animFrame,
      });
      return;
    }
  }
}

function hitPlayer(game: Game): void {
  const { state } = game;
  if (state.phase !== 'playing') return;
  const board = activeBoard(state);
  const px = board.player.x;
  const pz = board.player.z;
  board.player.alive = false;
  if (board.playerBullet) clearPlayerBullet(state);
  clearAlienShots(board.alienShots);
  board.ufo = null;
  board.alienHitFreezeTimer = 0;
  game.moveDir = 0;
  game.fireQueued = false;
  const i = state.activePlayer;
  state.livesByPlayer[i] = Math.max(0, state.livesByPlayer[i] - 1);
  syncActive(state);
  state.phase = 'dying';
  state.dyingTimer = PLAYER.dyingDuration;
  pushEvent(state, { type: 'playerHit', x: px, z: pz });
}

function updatePlayerBullet(state: GameState, dt: number): void {
  const board = activeBoard(state);
  if (board.playerBullet) {
    board.playerBullet.z += board.playerBullet.vz * dt;
    if (board.playerBullet.z > PLAYFIELD.maxZ + 1) {
      clearPlayerBullet(state);
    }
  }
}

function syncAlienShotUfoLock(board: BoardState): void {
  board.alienShots.squigglySlotLockedByUfo =
    ALIEN_SHOT.arcadeAuthenticUfoShotSlotSharing && board.ufo !== null;
}

function stepAlienShots(game: Game): void {
  const { state } = game;
  const board = activeBoard(state);
  syncAlienShotUfoLock(board);
  const ctx = alienShotContextFromGameState(
    state,
    () => hitPlayer(game),
    undefined,
    () => clearPlayerBullet(state),
  );
  updateAlienShots(board.alienShots, ctx);
}

function checkWaveClear(state: GameState): void {
  const board = activeBoard(state);
  if (aliveCount(board.aliens) > 0) return;
  state.phase = 'waveClear';
  state.waveClearTimer = FORMATION.waveClearDuration;
  if (board.playerBullet) clearPlayerBullet(state);
  clearAlienShots(board.alienShots);
  board.ufo = null;
  board.alienHitFreezeTimer = 0;
  pushEvent(state, { type: 'waveClear' });
}

function otherPlayer(i: 0 | 1): 0 | 1 {
  return i === 0 ? 1 : 0;
}

function switchToPlayer(game: Game, next: 0 | 1): void {
  const { state } = game;
  state.activePlayer = next;
  syncActive(state);
  const board = activeBoard(state);
  board.player.alive = true;
  board.player.x = 0;
  board.playerBullet = null;
  clearAlienShots(board.alienShots);
  board.ufo = null;
  board.alienHitFreezeTimer = 0;
  game.moveDir = 0;
  game.fireQueued = false;
  state.phase = 'playerSwitch';
  state.switchTimer = ATTRACT.playerSwitchDuration;
  pushEvent(state, {
    type: 'playerSwitch',
    player: next === 0 ? 1 : 2,
  });
}

function resolveAfterDeath(game: Game): void {
  const { state } = game;
  const i = state.activePlayer;

  if (state.playerCount === 2) {
    const o = otherPlayer(i);
    if (state.livesByPlayer[o] > 0) {
      switchToPlayer(game, o);
      return;
    }
  }

  if (state.livesByPlayer[i] > 0) {
    const board = activeBoard(state);
    board.player.alive = true;
    board.player.x = 0;
    game.moveDir = 0;
    game.fireQueued = false;
    state.phase = 'playing';
    syncActive(state);
    return;
  }

  game.moveDir = 0;
  game.fireQueued = false;
  state.phase = 'gameOver';
  state.menuPlayerCount = 1;
  state.gameOverTimer = ATTRACT.gameOverDuration;
  pushEvent(state, { type: 'gameOver' });
}

function nextAttractScreen(current: GameState['attractScreen']): GameState['attractScreen'] {
  const screens = ATTRACT.enabledScreens;
  const idx = screens.findIndex((screen) => screen === current);
  const nextIdx = idx < 0 ? 0 : (idx + 1) % screens.length;
  return screens[nextIdx] ?? 'info';
}

function updateAttract(game: Game, dt: number): void {
  const { state } = game;
  const board = activeBoard(state);
  state.attractTimer -= dt;
  if (state.attractTimer <= 0) {
    state.attractTimer = ATTRACT.screenDuration;
    state.attractScreen = nextAttractScreen(state.attractScreen);
  }

  const { aimX, targetZ, found } = pickDemoAim(
    board.aliens,
    board.formation,
    board.player.x,
    board.player.z,
    board.ufo,
    board.bunkers,
  );
  game.moveDir = found ? demoMoveDir(board.player.x, aimX) : 0;

  game.demoFireTimer -= dt;
  if (
    found &&
    demoShouldFire(
      board.player.x,
      aimX,
      targetZ,
      board.player.z,
      board.bunkers,
      board.playerBullet !== null,
      game.demoFireTimer <= 0,
    )
  ) {
    game.demoFireTimer = ATTRACT.demoFireCooldown;
    game.fireQueued = true;
    tryPlayerFire(game);
  }

  updatePlayer(game, dt);
  stepFormation(game, dt, false);
  updatePlayerBullet(state, dt);
  collidePlayerBullet(state, false);

  if (aliveCount(board.aliens) === 0) {
    startWave(board, 1);
    state.phase = 'attract';
  }
}

export function step(game: Game, dt: number): void {
  const { state } = game;

  if (state.phase === 'attract') {
    updateAttract(game, dt);
    return;
  }

  if (state.phase === 'dying') {
    state.dyingTimer -= dt;
    if (state.dyingTimer <= 0) {
      resolveAfterDeath(game);
    }
    return;
  }

  if (state.phase === 'invasion') {
    updateInvasion(game, dt);
    return;
  }

  if (state.phase === 'playerSwitch') {
    state.switchTimer -= dt;
    if (state.switchTimer <= 0) {
      state.phase = 'playing';
    }
    return;
  }

  if (state.phase === 'gameOver') {
    state.gameOverTimer -= dt;
    if (state.gameOverTimer <= 0) {
      enterAttract(state);
    }
    return;
  }

  if (state.phase === 'waveClear') {
    state.waveClearTimer -= dt;
    if (state.waveClearTimer <= 0) {
      const board = activeBoard(state);
      startWave(board, board.wave + 1);
      state.phase = 'playing';
    }
    return;
  }

  if (state.phase !== 'playing') return;

  const board = activeBoard(state);
  tryPlayerFire(game);
  updatePlayer(game, dt);

  if (board.alienHitFreezeTimer > 0) {
    board.alienHitFreezeTimer -= dt;
  }

  updateUfo(state, dt);
  updatePlayerBullet(state, dt);
  collidePlayerBullet(state, true);
  if (state.phase !== 'playing') return;

  if (board.alienHitFreezeTimer <= 0) {
    stepFormation(game, dt, true);
    if (state.phase !== 'playing') return;
  }
  stepAlienShots(game);
  checkWaveClear(state);
}

/** Test helper: expose UFO spawn */
export function __spawnUfoForTest(game: Game): Ufo {
  spawnUfo(game.state);
  return activeBoard(game.state).ufo!;
}
