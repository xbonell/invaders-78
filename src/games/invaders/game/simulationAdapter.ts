import type { GameSimulation } from '../../../arcade/loop/contracts';
import type { GameCommand, GameEvent, GameState } from './types';
import { createGame, dispatch, drainEvents, step, type Game } from './simulation';

/** Adapt the mutable Invaders `Game` object to the shared GameSimulation contract. */
export function asInvadersSimulation(
  game: Game,
): GameSimulation<GameState, GameCommand, GameEvent> {
  return {
    get state() {
      return game.state;
    },
    dispatch(command) {
      dispatch(game, command);
    },
    step(dt) {
      step(game, dt);
    },
    drainEvents() {
      return drainEvents(game);
    },
  };
}

export function createInvadersSimulation(highScore = 0): {
  game: Game;
  sim: GameSimulation<GameState, GameCommand, GameEvent>;
} {
  const game = createGame(highScore);
  return { game, sim: asInvadersSimulation(game) };
}
