/** Shared digital steer so keyboard and gamepad cannot overwrite each other. */

export type DigitalSteer = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

const keyboardSteer: DigitalSteer = {
  left: false,
  right: false,
  up: false,
  down: false,
};

export function getKeyboardSteer(): DigitalSteer {
  return { ...keyboardSteer };
}

export function setKeyboardSteer(next: Partial<DigitalSteer>): void {
  if (next.left !== undefined) keyboardSteer.left = next.left;
  if (next.right !== undefined) keyboardSteer.right = next.right;
  if (next.up !== undefined) keyboardSteer.up = next.up;
  if (next.down !== undefined) keyboardSteer.down = next.down;
}

export function clearKeyboardSteer(): void {
  keyboardSteer.left = false;
  keyboardSteer.right = false;
  keyboardSteer.up = false;
  keyboardSteer.down = false;
}

/** Exclusive horizontal/vertical: opposing inputs cancel to idle. */
export function steerDir(left: boolean, right: boolean): -1 | 0 | 1 {
  if (left && !right) return 1;
  if (right && !left) return -1;
  return 0;
}

export function combineSteer(pad: DigitalSteer, key: DigitalSteer): DigitalSteer {
  return {
    left: pad.left || key.left,
    right: pad.right || key.right,
    up: pad.up || key.up,
    down: pad.down || key.down,
  };
}
