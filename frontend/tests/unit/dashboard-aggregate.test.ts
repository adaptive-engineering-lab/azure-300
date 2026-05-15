import { describe, it, expect } from 'vitest';
import { computeDomainStats, computeActivityCalendar } from '../../src/lib/dashboard/aggregate';
import type { Domain } from '../../src/lib/questions/types';
import type { GuestSession } from '../../src/lib/store';

const Q = (id: string, domain: Domain) => ({ id, domain });

describe('Dashboard aggregations (feature 007)', () => {
  it('returns all 5 domains even when empty', () => {
    const stats = computeDomainStats({}, {});
    expect(stats.map((s) => s.domain)).toEqual([
      'mlops-infra',
      'ml-lifecycle',
      'genaiops-infra',
      'genai-quality',
      'genai-optimization',
    ]);
    expect(stats.every((s) => s.hasEnoughData === false)).toBe(true);
  });

  it('marks hasEnoughData true only after >= 5 answers', () => {
    const stats = computeDomainStats(
      {
        q1: { questionId: 'q1', timesSeen: 4, timesCorrect: 2, lastRating: 'correct', nextReview: null, updatedAt: '' },
      },
      { q1: 'ml-lifecycle' as Domain },
    );
    expect(stats.find((s) => s.domain === 'ml-lifecycle')!.hasEnoughData).toBe(false);

    const stats2 = computeDomainStats(
      {
        q1: { questionId: 'q1', timesSeen: 5, timesCorrect: 2, lastRating: 'correct', nextReview: null, updatedAt: '' },
      },
      { q1: 'ml-lifecycle' as Domain },
    );
    expect(stats2.find((s) => s.domain === 'ml-lifecycle')!.hasEnoughData).toBe(true);
  });

  it('flags weak only when hasEnoughData AND pct < 60', () => {
    const stats = computeDomainStats(
      {
        q1: { questionId: 'q1', timesSeen: 10, timesCorrect: 5, lastRating: 'almost', nextReview: null, updatedAt: '' },
      },
      { q1: 'genaiops-infra' as Domain },
    );
    const compute = stats.find((s) => s.domain === 'genaiops-infra')!;
    expect(compute.pct).toBe(50);
    expect(compute.weak).toBe(true);
  });

  it('does not flag weak at exactly 60%', () => {
    const stats = computeDomainStats(
      {
        q1: { questionId: 'q1', timesSeen: 10, timesCorrect: 6, lastRating: 'correct', nextReview: null, updatedAt: '' },
      },
      { q1: 'genai-quality' as Domain },
    );
    expect(stats.find((s) => s.domain === 'genai-quality')!.weak).toBe(false);
  });

  it('calendar has 12*7 = 84 cells', () => {
    const sessions: GuestSession[] = [];
    const cells = computeActivityCalendar(sessions, new Date('2026-05-11T00:00:00Z'));
    expect(cells).toHaveLength(84);
    expect(cells[cells.length - 1]!.date).toBe('2026-05-11');
  });

  it('calendar fills sessionCount for matching dates', () => {
    const sessions: GuestSession[] = [
      { id: '1', mode: 'mcq', topic: null, scorePct: 80, durationSeconds: 120, completedAt: '2026-05-10T12:00:00Z' },
      { id: '2', mode: 'flashcards', topic: null, scorePct: null, durationSeconds: 60, completedAt: '2026-05-10T18:00:00Z' },
    ];
    const cells = computeActivityCalendar(sessions, new Date('2026-05-11T00:00:00Z'));
    const day = cells.find((c) => c.date === '2026-05-10');
    expect(day!.sessionCount).toBe(2);
    expect(day!.minutes).toBe(3);
  });
});

// Silence unused
void Q;
