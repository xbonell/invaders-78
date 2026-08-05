import { resetGamepadEdges } from '../input/gamepad';

/** Thin Fullscreen API helpers; Esc uses the browser default (leave fullscreen). */

const listeners = new Set<(on: boolean) => void>();
let focusTarget: HTMLElement | null = null;

function notify(on: boolean): void {
  for (const fn of listeners) fn(on);
}

/** Shell (or other root) to focus after FS so keyboard/gamepad keep working. */
export function setFullscreenFocusTarget(el: HTMLElement | null): void {
  focusTarget = el;
}

/** Regain page focus after FS transitions (Steam Deck / Brave drop key focus). */
export function refocusPage(): void {
  try {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      active !== document.documentElement &&
      active !== focusTarget
    ) {
      active.blur();
    }
    window.focus();
    focusTarget?.focus({ preventScroll: true });
  } catch {
    // Some embeds disallow focus; gamepad poll still works without it.
  }
}

export function subscribeFullscreen(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function toggleFullscreen(): Promise<void> {
  try {
    // Blur menu buttons before FS so they are not left focused after resume.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    // Gesture / policy rejection; UI syncs via fullscreenchange.
  }
  refocusPage();
}

export function attachFullscreenListeners(): () => void {
  const onFs = () => {
    // Fullscreen remaps Steam pads; clear stuck South so A can fire again.
    resetGamepadEdges();
    notify(!!document.fullscreenElement);
    // rAF: focus after the UA finishes the FS transition.
    requestAnimationFrame(() => refocusPage());
  };
  document.addEventListener('fullscreenchange', onFs);
  return () => document.removeEventListener('fullscreenchange', onFs);
}
