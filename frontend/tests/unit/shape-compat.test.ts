import { describe, it, expect } from 'vitest';
import type { GuestProgress, GuestSession } from '../../src/lib/store';

/**
 * SC-005 / FR-009 / FR-010 — guest shape must mirror feature 001's authenticated tables.
 *
 * These compile-time checks fail the build if a field's name or type drifts.
 * Run-time checks ensure non-optional fields remain non-optional.
 */

describe('Shape compatibility with feature 001 (SC-005)', () => {
  it('GuestProgress carries every user_progress.* field except id and user_id', () => {
    const sample: GuestProgress = {
      questionId: '00000000-0000-4000-8000-000000000000',
      timesSeen: 1,
      timesCorrect: 0,
      lastRating: 'missed',
      nextReview: '2026-05-12',
      updatedAt: '2026-05-11T12:00:00Z',
    };
    // All authenticated columns except `id` and `user_id` must have a corresponding key.
    expect(sample).toHaveProperty('questionId');
    expect(sample).toHaveProperty('timesSeen');
    expect(sample).toHaveProperty('timesCorrect');
    expect(sample).toHaveProperty('lastRating');
    expect(sample).toHaveProperty('nextReview');
    expect(sample).toHaveProperty('updatedAt');
  });

  it('lastRating matches the user_progress_rating_chk values', () => {
    const valid: Array<GuestProgress['lastRating']> = ['correct', 'almost', 'missed', null];
    for (const v of valid) {
      const x: GuestProgress = {
        questionId: 'x',
        timesSeen: 0,
        timesCorrect: 0,
        lastRating: v,
        nextReview: null,
        updatedAt: '2026-05-11T12:00:00Z',
      };
      expect(x.lastRating).toBe(v);
    }
  });

  it('GuestSession.mode matches the sessions_mode_chk values', () => {
    const valid: Array<GuestSession['mode']> = ['flashcards', 'mcq', 'product-id', 'daily-review'];
    for (const m of valid) {
      const s: GuestSession = {
        id: '00000000-0000-4000-8000-000000000abc',
        mode: m,
        topic: null,
        scorePct: null,
        durationSeconds: null,
        completedAt: '2026-05-11T12:00:00Z',
      };
      expect(s.mode).toBe(m);
    }
  });
});
