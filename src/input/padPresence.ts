/** Shared “is a real gamepad connected?” flag for keyboard Space suppression. */

let padPresent = false;

export function setGamepadPresent(present: boolean): void {
  padPresent = present;
}

export function isGamepadPresent(): boolean {
  return padPresent;
}
