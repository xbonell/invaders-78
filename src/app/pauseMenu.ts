export const PAUSE_ITEMS = ['sound', 'fullscreen', 'back'] as const;

export type PauseMenuItem = (typeof PAUSE_ITEMS)[number];

export type PauseMenuInput = {
  navigate: (dir: -1 | 1) => void;
  confirm: () => void;
};

/** Default selection when entering pause. */
export const PAUSE_DEFAULT_INDEX = PAUSE_ITEMS.indexOf('back');

export function movePauseIndex(index: number, dir: -1 | 1): number {
  const len = PAUSE_ITEMS.length;
  return (index + dir + len) % len;
}

export function pauseItemAt(index: number): PauseMenuItem {
  const len = PAUSE_ITEMS.length;
  return PAUSE_ITEMS[((index % len) + len) % len];
}
