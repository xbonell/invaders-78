/** Display-only linear interpolation between fixed simulation ticks. */
export function interpolatePlayerX(
  prevTickX: number,
  currentX: number,
  alpha: number,
): number {
  return prevTickX + (currentX - prevTickX) * alpha;
}
