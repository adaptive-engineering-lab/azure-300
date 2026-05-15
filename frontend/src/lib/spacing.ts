import type { Rating } from './store';

/**
 * Simplified SM-2 per AI300-Game-Spec.md §9 + feature 008.
 * Correct: doubles previous interval (initial 3 days).
 * Almost:  1 day.
 * Missed:  1 day, interval streak resets.
 *
 * Returns the next-review ISO date string (YYYY-MM-DD).
 */
export interface SpacingInput {
  rating: Rating;
  priorTimesCorrect: number;
  today?: Date;
}

export function computeNextReview({ rating, priorTimesCorrect, today }: SpacingInput): string {
  const base = today ?? new Date();
  let days = 1;
  if (rating === 'correct') {
    days = 3 * Math.pow(2, priorTimesCorrect);
  } else if (rating === 'almost') {
    days = 1;
  } else {
    days = 1;
  }
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
