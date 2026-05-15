import type { Question } from './types';

/**
 * Pick up to `count` questions from `pool`, preferring those whose
 * difficulty matches `target`. Adjacent difficulties fill any deficit
 * (target ± 1, then ± 2). Within each difficulty band the order is
 * randomized so repeated runs aren't identical.
 *
 * This keeps the quiz "fulfilling" (delivering the requested length)
 * when a strict (domain, difficulty) cell is sparse, while still
 * weighting the experience toward the difficulty the user picked.
 */
export function pickWithDifficultyPreference<T extends Question>(
  pool: T[],
  target: 1 | 2 | 3,
  count: number,
  rng: () => number = Math.random,
): T[] {
  const byDistance = new Map<number, T[]>();
  for (const q of pool) {
    const d = Math.abs(q.difficulty - target);
    const bucket = byDistance.get(d) ?? [];
    bucket.push(q);
    byDistance.set(d, bucket);
  }

  const result: T[] = [];
  for (const distance of [...byDistance.keys()].sort((a, b) => a - b)) {
    const bucket = shuffle(byDistance.get(distance)!, rng);
    for (const q of bucket) {
      if (result.length >= count) return result;
      result.push(q);
    }
  }
  return result;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
