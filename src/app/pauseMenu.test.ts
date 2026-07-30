import { describe, expect, it } from 'vitest';
import { movePauseIndex, PAUSE_DEFAULT_INDEX, PAUSE_ITEMS, pauseItemAt } from './pauseMenu';

describe('pauseMenu', () => {
  it('defaults to Back to game', () => {
    expect(PAUSE_ITEMS[PAUSE_DEFAULT_INDEX]).toBe('back');
  });

  it('wraps navigation at both ends', () => {
    expect(movePauseIndex(0, -1)).toBe(PAUSE_ITEMS.length - 1);
    expect(movePauseIndex(PAUSE_ITEMS.length - 1, 1)).toBe(0);
  });

  it('moves one step within range', () => {
    expect(movePauseIndex(1, -1)).toBe(0);
    expect(movePauseIndex(1, 1)).toBe(2);
  });

  it('resolves item ids by index', () => {
    expect(pauseItemAt(0)).toBe('sound');
    expect(pauseItemAt(1)).toBe('fullscreen');
    expect(pauseItemAt(2)).toBe('controls');
    expect(pauseItemAt(3)).toBe('back');
  });
});
