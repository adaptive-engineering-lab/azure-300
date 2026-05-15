import { describe, it, expect } from 'vitest';
import { pickWithDifficultyPreference } from '../../src/lib/questions/pick';
import type { McqQuestion } from '../../src/lib/questions/types';

function mkMcq(id: string, difficulty: 1 | 2 | 3): McqQuestion {
  return {
    id,
    type: 'mcq',
    domain: 'ml-lifecycle',
    topic: 'blob',
    difficulty,
    content: {
      question: 'q?',
      options: { A: 'a', B: 'b', C: 'c', D: 'd' },
      correct: 'A',
      explanation: 'because.',
    },
  };
}

// Deterministic RNG for tests
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe('pickWithDifficultyPreference', () => {
  it('returns items at the target difficulty first when supply is plentiful', () => {
    const pool = [mkMcq('a', 1), mkMcq('b', 2), mkMcq('c', 2), mkMcq('d', 2), mkMcq('e', 3)];
    const out = pickWithDifficultyPreference(pool, 2, 3, seededRng(1));
    expect(out).toHaveLength(3);
    expect(out.every((q) => q.difficulty === 2)).toBe(true);
  });

  it('pads from adjacent difficulties when the target cell is sparse', () => {
    // identity-governance L1: simulate the real-world gap — only 1 at target, plenty adjacent.
    const pool = [mkMcq('a', 2), mkMcq('b', 2), mkMcq('c', 2), mkMcq('d', 3), mkMcq('e', 1)];
    const out = pickWithDifficultyPreference(pool, 1, 4, seededRng(1));
    expect(out).toHaveLength(4);
    // The single L1 must be first, then three L2 (distance 1) before any L3 (distance 2).
    expect(out[0]!.difficulty).toBe(1);
    expect(out.slice(1, 4).every((q) => q.difficulty === 2)).toBe(true);
  });

  it('falls back across two distance bands if needed', () => {
    const pool = [mkMcq('a', 1), mkMcq('b', 1), mkMcq('c', 3)];
    const out = pickWithDifficultyPreference(pool, 3, 3, seededRng(1));
    expect(out).toHaveLength(3);
    expect(out[0]!.difficulty).toBe(3);
    // remaining are L1 (distance 2), since no L2 in pool
    expect(out.slice(1).every((q) => q.difficulty === 1)).toBe(true);
  });

  it('returns fewer than count when the entire pool is smaller', () => {
    const pool = [mkMcq('a', 2)];
    const out = pickWithDifficultyPreference(pool, 2, 10, seededRng(1));
    expect(out).toHaveLength(1);
  });

  it('returns an empty array for an empty pool', () => {
    expect(pickWithDifficultyPreference([], 2, 5, seededRng(1))).toEqual([]);
  });

  it('randomizes order within a difficulty band across seeds', () => {
    const pool = [mkMcq('a', 2), mkMcq('b', 2), mkMcq('c', 2), mkMcq('d', 2), mkMcq('e', 2)];
    const a = pickWithDifficultyPreference(pool, 2, 5, seededRng(1)).map((q) => q.id);
    const b = pickWithDifficultyPreference(pool, 2, 5, seededRng(42)).map((q) => q.id);
    expect(a).not.toEqual(b);
    expect(new Set(a)).toEqual(new Set(b)); // same set, different order
  });
});
