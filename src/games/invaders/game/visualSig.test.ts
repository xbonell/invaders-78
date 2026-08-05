import { describe, expect, it } from 'vitest';
import { activeBoard, createGame, dispatch, __spawnUfoForTest } from './simulation';
import { visualSig } from './visualSig';

describe('visualSig', () => {
  it('stays stable when only player X moves', () => {
    const game = createGame(0);
    dispatch(game, { type: 'start' });
    expect(game.state.phase).toBe('playing');
    const before = visualSig(game.state);
    activeBoard(game.state).player.x += 0.25;
    expect(visualSig(game.state)).toBe(before);
  });

  it('changes when UFO presence toggles', () => {
    const game = createGame(0);
    game.state.phase = 'playing';
    const before = visualSig(game.state);
    __spawnUfoForTest(game);
    expect(visualSig(game.state)).not.toBe(before);
  });

  it('stays stable when UFO anim frame advances', () => {
    const game = createGame(0);
    game.state.phase = 'playing';
    const ufo = __spawnUfoForTest(game);
    const before = visualSig(game.state);
    ufo.animFrame = 1;
    expect(visualSig(game.state)).toBe(before);
  });

  it('stays stable when alien shot animation frame advances', () => {
    const game = createGame(0);
    dispatch(game, { type: 'start' });
    const slot = activeBoard(game.state).alienShots.rolling;
    slot.state = 'active';
    slot.animationFrame = 0;
    const before = visualSig(game.state);
    slot.animationFrame = 2;
    expect(visualSig(game.state)).toBe(before);
  });

  it('stays stable when formation origin steps', () => {
    const game = createGame(0);
    game.state.phase = 'playing';
    const before = visualSig(game.state);
    activeBoard(game.state).formation.originX += 0.4;
    activeBoard(game.state).formation.animFrame = 1;
    expect(visualSig(game.state)).toBe(before);
  });
});
