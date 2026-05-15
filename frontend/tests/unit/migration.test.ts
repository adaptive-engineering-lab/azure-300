import { describe, it, expect } from 'vitest';
import { buildMigrationPlan, migrationIsEmpty } from '../../src/lib/migration/plan';
import { mergeProgress } from '../../src/lib/migration/merge';
import type { GuestProgress, GuestSession } from '../../src/lib/store';

describe('Migration plan (FR-005, FR-006)', () => {
  it('counts progress and session entries', () => {
    const plan = buildMigrationPlan({
      progress: {
        a: { questionId: 'a', timesSeen: 1, timesCorrect: 1, lastRating: 'correct', nextReview: null, updatedAt: '2026-05-11T00:00:00Z' },
        b: { questionId: 'b', timesSeen: 2, timesCorrect: 0, lastRating: 'missed', nextReview: null, updatedAt: '2026-05-11T00:00:00Z' },
      },
      sessions: [
        { id: 's1', mode: 'mcq', topic: null, scorePct: 50, durationSeconds: 60, completedAt: '2026-05-11T00:00:00Z' } as GuestSession,
      ],
    });
    expect(plan.progressCount).toBe(2);
    expect(plan.sessionCount).toBe(1);
    expect(migrationIsEmpty(plan)).toBe(false);
  });

  it('migrationIsEmpty returns true for zero records', () => {
    const plan = buildMigrationPlan({ progress: {}, sessions: [] });
    expect(migrationIsEmpty(plan)).toBe(true);
  });
});

describe('Conflict resolution (FR-010)', () => {
  const remote = {
    question_id: 'q1',
    times_seen: 3,
    times_correct: 1,
    last_rating: 'almost' as const,
    next_review: '2026-05-12',
    updated_at: '2026-05-10T10:00:00Z',
  };

  it('prefers higher times_seen and times_correct', () => {
    const local: GuestProgress = {
      questionId: 'q1',
      timesSeen: 5,
      timesCorrect: 4,
      lastRating: 'correct',
      nextReview: '2026-05-15',
      updatedAt: '2026-05-11T10:00:00Z',
    };
    const merged = mergeProgress(local, remote);
    expect(merged.times_seen).toBe(5);
    expect(merged.times_correct).toBe(4);
  });

  it('prefers the more recent last_rating by updatedAt', () => {
    const newer: GuestProgress = {
      questionId: 'q1',
      timesSeen: 1,
      timesCorrect: 0,
      lastRating: 'missed',
      nextReview: '2026-05-12',
      updatedAt: '2026-05-12T10:00:00Z',
    };
    const merged = mergeProgress(newer, remote);
    expect(merged.last_rating).toBe('missed');
    expect(merged.updated_at).toBe('2026-05-12T10:00:00Z');
  });

  it('honors times_correct <= times_seen invariant', () => {
    const local: GuestProgress = {
      questionId: 'q1',
      timesSeen: 2,
      timesCorrect: 2,
      lastRating: 'correct',
      nextReview: null,
      updatedAt: '2026-05-11T10:00:00Z',
    };
    const merged = mergeProgress(local, remote);
    expect(merged.times_correct).toBeLessThanOrEqual(merged.times_seen);
  });
});
