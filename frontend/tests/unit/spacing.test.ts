import { describe, it, expect } from 'vitest';
import { computeNextReview } from '../../src/lib/spacing';

describe('Spacing policy (feature 004 / 008)', () => {
  const today = new Date('2026-05-11T00:00:00Z');

  it('correct on a fresh card schedules 3 days out', () => {
    expect(computeNextReview({ rating: 'correct', priorTimesCorrect: 0, today })).toBe('2026-05-14');
  });

  it('correct doubles each consecutive correct (3 → 6 → 12)', () => {
    expect(computeNextReview({ rating: 'correct', priorTimesCorrect: 1, today })).toBe('2026-05-17');
    expect(computeNextReview({ rating: 'correct', priorTimesCorrect: 2, today })).toBe('2026-05-23');
  });

  it('almost schedules tomorrow', () => {
    expect(computeNextReview({ rating: 'almost', priorTimesCorrect: 5, today })).toBe('2026-05-12');
  });

  it('missed schedules tomorrow regardless of prior correct streak', () => {
    expect(computeNextReview({ rating: 'missed', priorTimesCorrect: 4, today })).toBe('2026-05-12');
  });
});
