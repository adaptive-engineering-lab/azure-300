import { describe, it, expect } from 'vitest';
import { findDueQuestionIds, DAILY_REVIEW_CAP } from '../../src/lib/dashboard/due';
import type { GuestProgressMap } from '../../src/lib/store';

const today = new Date('2026-05-11T12:00:00Z');

function entry(id: string, nextReview: string | null) {
  return {
    questionId: id,
    timesSeen: 1,
    timesCorrect: 0,
    lastRating: null,
    nextReview,
    updatedAt: '2026-05-10T12:00:00Z',
  } as const;
}

describe('Due-question detection (feature 008)', () => {
  it('returns empty for no progress', () => {
    expect(findDueQuestionIds({}, today)).toEqual([]);
  });

  it('returns only entries due today or earlier', () => {
    const progress: GuestProgressMap = {
      a: entry('a', '2026-05-09'),
      b: entry('b', '2026-05-11'),
      c: entry('c', '2026-05-12'),
      d: entry('d', null),
    };
    const ids = findDueQuestionIds(progress, today);
    expect(ids.sort()).toEqual(['a', 'b']);
  });

  it('sorts by nextReview ascending (oldest first)', () => {
    const progress: GuestProgressMap = {
      a: entry('a', '2026-05-10'),
      b: entry('b', '2026-05-08'),
      c: entry('c', '2026-05-09'),
    };
    const ids = findDueQuestionIds(progress, today);
    expect(ids).toEqual(['b', 'c', 'a']);
  });

  it('exports the daily cap of 30', () => {
    expect(DAILY_REVIEW_CAP).toBe(30);
  });
});
