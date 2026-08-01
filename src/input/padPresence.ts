/**
 * Gamepad presence for Steam Deck desktop quirks.
 * `seenThisSession` latches true once a pad appears — fullscreen often drops
 * getGamepads() while Y→Space keeps working; we still want Space suppressed.
 */

let padPresent = false;
let seenThisSession = false;

export function setGamepadPresent(present: boolean): void {
  padPresent = present;
  if (present) seenThisSession = true;
}

export function isGamepadPresent(): boolean {
  return padPresent;
}

/** True after any connected pad was observed this page load. */
export function hasSeenGamepad(): boolean {
  return seenThisSession;
}

/** @internal tests */
export function resetGamepadPresenceForTests(): void {
  padPresent = false;
  seenThisSession = false;
}
