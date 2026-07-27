export interface ScoreFloatSpawn {
  points: number;
  x: number;
  z: number;
}

const queue: ScoreFloatSpawn[] = [];

/** Queue UFO score popups for the scene (survives React frame gaps). */
export function enqueueScoreFloats(spawns: ScoreFloatSpawn[]): void {
  for (const s of spawns) {
    if (s.points > 0) queue.push(s);
  }
}

export function drainScoreFloatQueue(): ScoreFloatSpawn[] {
  if (queue.length === 0) return [];
  return queue.splice(0, queue.length);
}
