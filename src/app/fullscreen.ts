/** Thin Fullscreen API helpers; Esc uses the browser default (leave fullscreen). */

const listeners = new Set<(on: boolean) => void>();

function notify(on: boolean): void {
  for (const fn of listeners) fn(on);
}

/** Regain page focus after FS transitions (Steam Deck / Brave drop key focus). */
function refocusPage(): void {
  try {
    window.focus();
    document.documentElement.focus?.();
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
    notify(!!document.fullscreenElement);
    refocusPage();
  };
  document.addEventListener('fullscreenchange', onFs);
  return () => document.removeEventListener('fullscreenchange', onFs);
}
