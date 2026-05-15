import type { GuestProgressMap } from '../store';

export function findDueQuestionIds(progress: GuestProgressMap, today?: Date): string[] {
  const todayIso = (today ?? new Date()).toISOString().slice(0, 10);
  return Object.values(progress)
    .filter((p) => p.nextReview !== null && p.nextReview <= todayIso)
    .sort((a, b) => (a.nextReview ?? '').localeCompare(b.nextReview ?? ''))
    .map((p) => p.questionId);
}

export const DAILY_REVIEW_CAP = 30;
