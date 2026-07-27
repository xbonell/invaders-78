import { describe, expect, it } from 'vitest';
import { createGame, dispatch, __spawnUfoForTest } from './simulation';
import { visualSig } from './visualSig';

describe('visualSig', () => {
  it('stays stable when only player X moves', () => {
    const game = createGame(0);
    dispatch(game, { type: 'credit' });
    dispatch(game, { type: 'start', players: 1 });
    expect(game.state.phase).toBe('playing');
    const before = visualSig(game.state);
    game.state.player.x += 0.25;
    expect(visualSig(game.state)).toBe(before);
  });

  it('changes when UFO presence toggles', () => {
    const game = createGame(0);
    game.state.phase = 'playing';
    const before = visualSig(game.state);
    __spawnUfoForTest(game);
    expect(visualSig(game.state)).not.toBe(before);
  });

  it('changes when UFO anim frame advances', () => {
    const game = createGame(0);
    game.state.phase = 'playing';
    const ufo = __spawnUfoForTest(game);
    const before = visualSig(game.state);
    ufo.animFrame = 1;
    expect(visualSig(game.state)).not.toBe(before);
  });

  it('changes when formation origin steps', () => {
    const game = createGame(0);
    game.state.phase = 'playing';
    const before = visualSig(game.state);
    game.state.formation.originX += 0.4;
    expect(visualSig(game.state)).not.toBe(before);
  });
});
