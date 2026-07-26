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
  playfieldMaxAbsCenterX,
} from './constants';
import {
  bulletHitsPoint,
  erodeBunkerAt,
} from './collisions';
import {
  alienShotContextFromGameState,
  clearAlienShots,
  createAlienShotSystem,
  injectAlienShotAtPlayer,
  resetAlienShotSystemForWave,
  updateAlienShots,
} from './alienShots';
import {
  alienWorldPos,
  aliveCount,
  createAliens,
  createBunkers,
  createFormation,
  formationStepX,
  formationWouldHitEdge,
  stepIntervalForCount,
} from './formation';
import type {
  Alien,
  GameCommand,
  GameEvent,
  GameState,
  Ufo,
} from './types';

export { injectAlienShotAtPlayer };

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
  const before = state.scores[i]!;
  state.scores[i] = before + points;
  state.score = state.scores[i]!;
  state.highScore = Math.max(
    state.highScore,
    state.scores[0]!,
    state.scores[1]!,
  );
  if (
    !state.bonusLifeAwarded[i] &&
    before < PLAYER.bonusLifeAt &&
    state.scores[i]! >= PLAYER.bonusLifeAt
  ) {
    state.bonusLifeAwarded[i] = true;
    state.livesByPlayer[i] = state.livesByPlayer[i]! + 1;
    state.lives = state.livesByPlayer[i]!;
  }
}

function enterAttract(state: GameState): void {
  state.scores = [0, 0];
  state.livesByPlayer = [PLAYER.startLives, PLAYER.startLives];
  state.activePlayer = 0;
  state.playerCount = 1;
  state.shotCounts = [0, 0];
  state.bonusLifeAwarded = [false, false];
  state.alienHitFreezeTimer = 0;
  state.attractTimer = ATTRACT.screenDuration;
  state.attractScreen = 0;
  state.gameOverTimer = 0;
  state.switchTimer = 0;
  startWave(state, 1);
  state.phase = 'attract';
  syncActive(state);
}

function baseState(highScore: number): GameState {
  const state: GameState = {
    phase: 'attract',
    score: 0,
    scores: [0, 0],
    highScore,
    lives: PLAYER.startLives,
    livesByPlayer: [PLAYER.startLives, PLAYER.startLives],
    wave: 1,
    playerCount: 1,
    activePlayer: 0,
    player: { x: 0, z: PLAYER.z, alive: true },
    aliens: [],
    formation: createFormation(1),
    playerBullet: null,
    alienShots: createAlienShotSystem(),
    bunkers: [],
    ufo: null,
    ufoSpawnTimer: UFO.spawnInterval * 0.5,
    dyingTimer: 0,
    waveClearTimer: 0,
    gameOverTimer: 0,
    switchTimer: 0,
    attractTimer: ATTRACT.screenDuration,
    attractScreen: 0,
    events: emptyEvents(),
    shotCount: 0,
    shotCounts: [0, 0],
    bonusLifeAwarded: [false, false],
    alienHitFreezeTimer: 0,
    credits: 0,
  };
  startWave(state, 1);
  state.phase = 'attract';
  syncActive(state);
  return state;
}

function startWave(state: GameState, wave: number): void {
  state.wave = wave;
  state.aliens = createAliens();
  state.formation = createFormation(wave);
  state.playerBullet = null;
  resetAlienShotSystemForWave(state.alienShots);
  state.bunkers = createBunkers();
  state.ufo = null;
  state.ufoSpawnTimer = UFO.spawnInterval;
  state.alienHitFreezeTimer = 0;
  state.player.x = 0;
  state.player.z = PLAYER.z;
  state.player.alive = true;
}

export function createGame(highScore = 0): Game {
  const state = baseState(highScore);
  const game: Game = {
    state,
    moveDir: 0,
    fireQueued: false,
    demoFireTimer: ATTRACT.demoFireInterval,
    getAlienWorldPos: (alien) => alienWorldPos(alien, game.state.formation),
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

function beginPlay(state: GameState, playerCount: 1 | 2): void {
  const cost = playerCount;
  if (state.credits < cost) return;
  state.credits -= cost;
  state.playerCount = playerCount;
  state.activePlayer = 0;
  state.scores = [0, 0];
  state.livesByPlayer = [
    PLAYER.startLives,
    playerCount === 2 ? PLAYER.startLives : 0,
  ];
  state.shotCounts = [0, 0];
  state.bonusLifeAwarded = [false, false];
  startWave(state, 1);
  state.phase = 'playing';
  syncActive(state);
}

export function dispatch(game: Game, cmd: GameCommand): void {
  const { state } = game;
  switch (cmd.type) {
    case 'credit':
      state.credits = Math.min(99, state.credits + 1);
      break;
    case 'start':
      if (
        state.phase === 'attract' ||
        state.phase === 'ready' ||
        state.phase === 'gameOver'
      ) {
        beginPlay(state, 1);
      }
      break;
    case 'startTwo':
      if (
        state.phase === 'attract' ||
        state.phase === 'ready' ||
        state.phase === 'gameOver'
      ) {
        beginPlay(state, 2);
      }
      break;
    case 'restart':
      beginPlay(state, state.playerCount);
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
  if (
    (state.phase !== 'playing' && state.phase !== 'attract') ||
    !state.player.alive
  ) {
    return;
  }
  if (state.playerBullet) return;
  state.playerBullet = {
    x: state.player.x,
    z: state.player.z + PLAYER.bulletSpawnOffsetZ,
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
  state.shotCounts[i] = state.shotCounts[i]! + 1;
  state.shotCount = state.shotCounts[i]!;
}

function clearPlayerBullet(state: GameState): void {
  if (!state.playerBullet) return;
  state.playerBullet = null;
  onPlayerShotRemoved(state);
}

function updatePlayer(game: Game, dt: number): void {
  const { state } = game;
  if (!state.player.alive) return;
  state.player.x += game.moveDir * PLAYER.speed * dt;
  const max = playerMaxAbsX();
  state.player.x = Math.max(-max, Math.min(max, state.player.x));
}

function stepFormation(game: Game, dt: number, emitAudio: boolean): void {
  const { state } = game;
  const alive = aliveCount(state.aliens);
  if (alive === 0) return;

  state.formation.stepInterval = stepIntervalForCount(alive, state.wave);
  state.formation.stepTimer += dt;
  if (state.formation.stepTimer < state.formation.stepInterval) return;
  state.formation.stepTimer = 0;

  const stepX = formationStepX(alive, state.formation.dir);
  if (formationWouldHitEdge(state.aliens, state.formation, stepX)) {
    state.formation.dir = state.formation.dir === 1 ? -1 : 1;
    state.formation.originZ -= FORMATION.dropZ;
  } else {
    state.formation.originX += state.formation.dir * stepX;
  }

  state.formation.animFrame = state.formation.animFrame === 0 ? 1 : 0;
  const note = state.formation.marchNote % 4;
  state.formation.marchNote = (state.formation.marchNote + 1) % 4;
  if (emitAudio) {
    pushEvent(state, { type: 'formationStep', note });
  }

  if (state.phase === 'attract') {
    for (const a of state.aliens) {
      if (!a.alive) continue;
      const p = alienWorldPos(a, state.formation);
      if (p.z <= PLAYER.z + 2.5) {
        startWave(state, 1);
        state.phase = 'attract';
        return;
      }
    }
    return;
  }

  for (const a of state.aliens) {
    if (!a.alive) continue;
    const p = alienWorldPos(a, state.formation);
    if (p.z <= PLAYER.z + 0.8) {
      beginInvasion(game);
      return;
    }
  }
}

/** Aliens reached the player line: ship explodes, formation flies off-screen, then game over. */
function beginInvasion(game: Game): void {
  const { state } = game;
  if (state.phase !== 'playing') return;
  const px = state.player.x;
  const pz = state.player.z;
  state.player.alive = false;
  if (state.playerBullet) clearPlayerBullet(state);
  clearAlienShots(state.alienShots);
  state.ufo = null;
  state.alienHitFreezeTimer = 0;
  game.moveDir = 0;
  game.fireQueued = false;
  state.livesByPlayer[0] = 0;
  state.livesByPlayer[1] = 0;
  syncActive(state);
  state.phase = 'invasion';
  state.dyingTimer = FORMATION.invasionDuration;
  pushEvent(state, { type: 'playerHit', x: px, z: pz });
}

function updateInvasion(game: Game, dt: number): void {
  const { state } = game;
  state.formation.originZ -= FORMATION.invasionFlySpeed * dt;
  state.dyingTimer -= dt;

  if (state.dyingTimer <= 0) {
    game.moveDir = 0;
    game.fireQueued = false;
    state.phase = 'gameOver';
    state.gameOverTimer = ATTRACT.gameOverDuration;
    pushEvent(state, { type: 'gameOver' });
  }
}

function mysteryScoreIndex(shotCount: number): number {
  return shotCount % UFO.scoreTable.length;
}

function spawnUfo(state: GameState): void {
  if (state.ufo) return;
  if (aliveCount(state.aliens) < UFO.minAliensToSpawn) return;
  // Odd completed-shot count → from left (ROM LSB of shot counter)
  const fromLeft = (state.shotCount & 1) === 1;
  const index = mysteryScoreIndex(state.shotCount);
  const edge = playfieldMaxAbsCenterX(UFO.halfWidth);
  state.ufo = {
    x: fromLeft ? -edge : edge,
    z: UFO.z,
    vx: fromLeft ? UFO.speed : -UFO.speed,
    scoreIndex: index,
  };
  pushEvent(state, { type: 'ufoSpawn' });
}

function updateUfo(state: GameState, dt: number): void {
  state.ufoSpawnTimer -= dt;
  if (state.ufoSpawnTimer <= 0) {
    state.ufoSpawnTimer = UFO.spawnInterval;
    spawnUfo(state);
  }
  if (!state.ufo) return;
  state.ufo.x += state.ufo.vx * dt;
  const edge = playfieldMaxAbsCenterX(UFO.halfWidth);
  // Keep saucer inside the game area; despawn once it reaches the far rim
  if (state.ufo.vx > 0 && state.ufo.x >= edge) {
    state.ufo = null;
    pushEvent(state, { type: 'ufoDespawn' });
    return;
  }
  if (state.ufo.vx < 0 && state.ufo.x <= -edge) {
    state.ufo = null;
    pushEvent(state, { type: 'ufoDespawn' });
    return;
  }
  state.ufo.x = Math.max(-edge, Math.min(edge, state.ufo.x));
}

function collidePlayerBullet(state: GameState, scoring: boolean): void {
  const b = state.playerBullet;
  if (!b) return;

  for (const bunker of state.bunkers) {
    if (erodeBunkerAt(bunker, b)) {
      clearPlayerBullet(state);
      // Always emit FX (attract demo kills need explosions too)
      pushEvent(state, { type: 'bunkerHit', x: b.x, z: b.z });
      return;
    }
  }

  if (state.ufo) {
    if (
      bulletHitsPoint(
        b,
        state.ufo.x,
        state.ufo.z,
        UFO.halfWidth,
        UFO.halfDepth,
      )
    ) {
      const ux = state.ufo.x;
      const uz = state.ufo.z;
      // Score from current pointer at hit (ROM); then shot removal advances it
      const index = mysteryScoreIndex(state.shotCount);
      const points = scoring ? UFO.scoreTable[index]! : 0;
      if (scoring) addScore(state, points);
      pushEvent(state, { type: 'ufoHit', points, x: ux, z: uz });
      state.ufo = null;
      clearPlayerBullet(state);
      return;
    }
  }

  for (const alien of state.aliens) {
    if (!alien.alive) continue;
    const p = alienWorldPos(alien, state.formation);
    if (bulletHitsPoint(b, p.x, p.z, HIT.alienHalfW, HIT.alienHalfD)) {
      alien.alive = false;
      clearPlayerBullet(state);
      const points = scoring ? (ALIEN_POINTS[alien.type] ?? 10) : 0;
      if (scoring) addScore(state, points);
      if (scoring) {
        state.alienHitFreezeTimer = FORMATION.alienHitFreeze;
      }
      pushEvent(state, {
        type: 'alienHit',
        points,
        x: p.x,
        z: p.z,
        alienType: alien.type,
        animFrame: state.formation.animFrame,
      });
      return;
    }
  }
}

function hitPlayer(game: Game): void {
  const { state } = game;
  if (state.phase !== 'playing') return;
  const px = state.player.x;
  const pz = state.player.z;
  state.player.alive = false;
  if (state.playerBullet) clearPlayerBullet(state);
  clearAlienShots(state.alienShots);
  state.ufo = null;
  state.alienHitFreezeTimer = 0;
  game.moveDir = 0;
  game.fireQueued = false;
  const i = state.activePlayer;
  state.livesByPlayer[i] = Math.max(0, state.livesByPlayer[i]! - 1);
  syncActive(state);
  state.phase = 'dying';
  state.dyingTimer = PLAYER.dyingDuration;
  pushEvent(state, { type: 'playerHit', x: px, z: pz });
}

function updatePlayerBullet(state: GameState, dt: number): void {
  if (state.playerBullet) {
    state.playerBullet.z += state.playerBullet.vz * dt;
    if (state.playerBullet.z > PLAYFIELD.maxZ + 1) {
      clearPlayerBullet(state);
    }
  }
}

function syncAlienShotUfoLock(state: GameState): void {
  state.alienShots.squigglySlotLockedByUfo =
    ALIEN_SHOT.arcadeAuthenticUfoShotSlotSharing && state.ufo !== null;
}

function stepAlienShots(game: Game): void {
  const { state } = game;
  syncAlienShotUfoLock(state);
  const ctx = alienShotContextFromGameState(
    state,
    () => hitPlayer(game),
    undefined,
    () => clearPlayerBullet(state),
  );
  updateAlienShots(state.alienShots, ctx);
}

function checkWaveClear(state: GameState): void {
  if (aliveCount(state.aliens) > 0) return;
  state.phase = 'waveClear';
  state.waveClearTimer = FORMATION.waveClearDuration;
  if (state.playerBullet) clearPlayerBullet(state);
  clearAlienShots(state.alienShots);
  state.ufo = null;
  state.alienHitFreezeTimer = 0;
  pushEvent(state, { type: 'waveClear' });
}

function otherPlayer(i: 0 | 1): 0 | 1 {
  return i === 0 ? 1 : 0;
}

function resolveAfterDeath(game: Game): void {
  const { state } = game;
  const i = state.activePlayer;
  if (state.livesByPlayer[i]! > 0) {
    state.player.alive = true;
    state.player.x = 0;
    game.moveDir = 0;
    game.fireQueued = false;
    state.phase = 'playing';
    syncActive(state);
    return;
  }

  if (state.playerCount === 2) {
    const o = otherPlayer(i);
    if (state.livesByPlayer[o]! > 0) {
      state.activePlayer = o;
      syncActive(state);
      state.player.alive = true;
      state.player.x = 0;
      state.playerBullet = null;
      clearAlienShots(state.alienShots);
      state.ufo = null;
      game.moveDir = 0;
      game.fireQueued = false;
      state.phase = 'playerSwitch';
      state.switchTimer = ATTRACT.playerSwitchDuration;
      pushEvent(state, {
        type: 'playerSwitch',
        player: (o + 1) as 1 | 2,
      });
      return;
    }
  }

  game.moveDir = 0;
  game.fireQueued = false;
  state.phase = 'gameOver';
  state.gameOverTimer = ATTRACT.gameOverDuration;
  pushEvent(state, { type: 'gameOver' });
}

function updateAttract(game: Game, dt: number): void {
  const { state } = game;
  state.attractTimer -= dt;
  if (state.attractTimer <= 0) {
    state.attractTimer = ATTRACT.screenDuration;
    state.attractScreen = state.attractScreen === 0 ? 1 : 0;
  }

  let targetX = 0;
  let found = false;
  let bestDist = Infinity;
  for (const a of state.aliens) {
    if (!a.alive) continue;
    const p = alienWorldPos(a, state.formation);
    const d = Math.abs(p.x - state.player.x);
    if (d < bestDist) {
      bestDist = d;
      targetX = p.x;
      found = true;
    }
  }
  if (found) {
    const dx = targetX - state.player.x;
    game.moveDir = dx < -0.15 ? -1 : dx > 0.15 ? 1 : 0;
  } else {
    game.moveDir = 0;
  }

  game.demoFireTimer -= dt;
  if (game.demoFireTimer <= 0) {
    game.demoFireTimer = ATTRACT.demoFireInterval;
    game.fireQueued = true;
    tryPlayerFire(game);
  }

  updatePlayer(game, dt);
  stepFormation(game, dt, false);
  updatePlayerBullet(state, dt);
  collidePlayerBullet(state, false);

  if (aliveCount(state.aliens) === 0) {
    startWave(state, 1);
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
      startWave(state, state.wave + 1);
      state.phase = 'playing';
    }
    return;
  }

  if (state.phase !== 'playing') return;

  tryPlayerFire(game);
  updatePlayer(game, dt);

  if (state.alienHitFreezeTimer > 0) {
    state.alienHitFreezeTimer -= dt;
  }

  updateUfo(state, dt);
  updatePlayerBullet(state, dt);
  collidePlayerBullet(state, true);
  if (state.phase !== 'playing') return;

  if (state.alienHitFreezeTimer <= 0) {
    stepFormation(game, dt, true);
    if (state.phase !== 'playing') return;
  }
  stepAlienShots(game);
  checkWaveClear(state);
}

/** Test helper: expose UFO spawn */
export function __spawnUfoForTest(game: Game): Ufo {
  spawnUfo(game.state);
  return game.state.ufo!;
}
