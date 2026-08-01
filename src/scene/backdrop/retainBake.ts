export type BakeSlot<T> = { current: T | null };

/**
 * Keep one bake for the page lifetime. React Strict Mode remounts effects and
 * would otherwise revoke a still-referenced blob URL (ERR_FILE_NOT_FOUND).
 */
export function retainBake<T>(slot: BakeSlot<T>, create: () => T): T {
  if (!slot.current) slot.current = create();
  return slot.current;
}
