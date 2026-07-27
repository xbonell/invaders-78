/** Thin Fullscreen API helpers; Esc uses the browser default (leave fullscreen). */

const listeners = new Set<(on: boolean) => void>();

function notify(on: boolean): void {
  for (const fn of listeners) fn(on);
}

export function subscribeFullscreen(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    // Gesture / policy rejection; UI syncs via fullscreenchange.
  }
}

export function attachFullscreenListeners(): () => void {
  const onFs = () => notify(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', onFs);
  return () => document.removeEventListener('fullscreenchange', onFs);
}
