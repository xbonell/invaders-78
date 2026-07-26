import { describe, expect, it } from 'vitest';
import { createGame, dispatch, drainEvents, step } from './simulation';
import { FORMATION, PLAYER, TICK_DT } from './constants';

function startGame() {
  const game = createGame(0);
  dispatch(game, { type: 'credit' });
  dispatch(game, { type: 'start' });
  return game;
}

describe('simulation core', () => {
  it('boots in attract and enters playing after credit + start', () => {
    const game = createGame(0);
    expect(game.state.phase).toBe('attract');
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start' });
    expect(game.state.phase).toBe('playing');
    expect(game.state.lives).toBe(PLAYER.startLives);
    expect(game.state.aliens.filter((a) => a.alive)).toHaveLength(
      FORMATION.cols * FORMATION.rows,
    );
  });

  it('allows only one player shot at a time', () => {
    const game = startGame();
    dispatch(game, { type: 'fire' });
    expect(game.state.playerBullet).not.toBeNull();
    const first = game.state.playerBullet;
    dispatch(game, { type: 'fire' });
    expect(game.state.playerBullet).toBe(first);
  });

  it('awards points when player bullet hits an alien', () => {
    const game = startGame();
    const alien = game.state.aliens.find((a) => a.alive)!;
    const pos = game.getAlienWorldPos(alien);
    game.state.playerBullet = {
      x: pos.x,
      z: pos.z - 0.2,
      vz: 20,
      fromPlayer: true,
    };
    step(game, TICK_DT);
    expect(alien.alive).toBe(false);
    expect(game.state.score).toBeGreaterThan(0);
    expect(game.state.playerBullet).toBeNull();
    const events = drainEvents(game);
    expect(events.some((e) => e.type === 'alienHit')).toBe(true);
  });

  it('loses a life and enters dying when player is hit', () => {
    const game = startGame();
    game.state.alienBullets.push({
      x: game.state.player.x,
      z: game.state.player.z + 0.1,
      vz: -10,
      fromPlayer: false,
    });
    step(game, TICK_DT);
    expect(game.state.phase).toBe('dying');
    expect(game.state.lives).toBe(PLAYER.startLives - 1);
  });

  it('goes game over when last life is lost', () => {
    const game = startGame();
    game.state.livesByPlayer[0] = 1;
    game.state.lives = 1;
    game.state.alienBullets.push({
      x: game.state.player.x,
      z: game.state.player.z + 0.1,
      vz: -10,
      fromPlayer: false,
    });
    step(game, TICK_DT);
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('gameOver');
  });

  it('clears stuck movement after death even if keys released while dying', () => {
    const game = startGame();
    dispatch(game, { type: 'move', dir: 1 });
    expect(game.moveDir).toBe(1);
    game.state.alienBullets.push({
      x: game.state.player.x,
      z: game.state.player.z + 0.1,
      vz: -10,
      fromPlayer: false,
    });
    step(game, TICK_DT);
    expect(game.state.phase).toBe('dying');
    expect(game.moveDir).toBe(0);
    // Releases during dying must still update moveDir
    dispatch(game, { type: 'move', dir: -1 });
    expect(game.moveDir).toBe(-1);
    dispatch(game, { type: 'move', dir: 0 });
    expect(game.moveDir).toBe(0);
    game.state.dyingTimer = 0;
    step(game, TICK_DT);
    expect(game.state.phase).toBe('playing');
    expect(game.moveDir).toBe(0);
  });
});
