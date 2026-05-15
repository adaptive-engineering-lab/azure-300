import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/lib/store';
import { levelFromXp } from '../../src/lib/store/profile';

const QID = '00000000-0000-4000-8000-000000000001';

describe('Store: progress and profile (FR-008, FR-009)', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('records a rating into progress with correct counts', () => {
    useAppStore.getState().recordRating({ questionId: QID, rating: 'correct', nextReview: '2026-05-14' });
    const entry = useAppStore.getState().progress[QID];
    expect(entry).toBeTruthy();
    expect(entry!.timesSeen).toBe(1);
    expect(entry!.timesCorrect).toBe(1);
    expect(entry!.lastRating).toBe('correct');
    expect(entry!.nextReview).toBe('2026-05-14');
  });

  it('"missed" does not increment timesCorrect', () => {
    useAppStore.getState().recordRating({ questionId: QID, rating: 'missed', nextReview: '2026-05-12' });
    const entry = useAppStore.getState().progress[QID];
    expect(entry!.timesSeen).toBe(1);
    expect(entry!.timesCorrect).toBe(0);
  });

  it('records sessions in newest-first order', () => {
    const s = useAppStore.getState();
    s.recordSession({ mode: 'mcq', topic: 'rbac', scorePct: 80, durationSeconds: 60, now: new Date('2026-05-10') });
    s.recordSession({ mode: 'flashcards', topic: null, scorePct: null, durationSeconds: 120, now: new Date('2026-05-11') });
    const sessions = useAppStore.getState().sessions;
    expect(sessions).toHaveLength(2);
    expect(sessions[0]!.mode).toBe('flashcards');
    expect(sessions[1]!.mode).toBe('mcq');
  });

  it('addXp bumps level when crossing thresholds', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(499)).toBe(1);
    expect(levelFromXp(500)).toBe(2);
    expect(levelFromXp(2000)).toBe(3);
    expect(levelFromXp(5000)).toBe(4);

    useAppStore.getState().addXp(500);
    expect(useAppStore.getState().profile.xp).toBe(500);
    expect(useAppStore.getState().profile.level).toBe(2);
  });

  it('bumpStreakIfDue increments only once per day and resets on multi-day gaps', () => {
    const day = (n: number) => new Date(`2026-05-${String(10 + n).padStart(2, '0')}T08:00:00Z`);
    const s = useAppStore.getState();

    s.bumpStreakIfDue(day(0));
    expect(useAppStore.getState().profile.streakDays).toBe(1);

    // same day — no change
    s.bumpStreakIfDue(day(0));
    expect(useAppStore.getState().profile.streakDays).toBe(1);

    // next day — increments
    s.bumpStreakIfDue(day(1));
    expect(useAppStore.getState().profile.streakDays).toBe(2);

    // skip two days — resets to 1
    s.bumpStreakIfDue(day(4));
    expect(useAppStore.getState().profile.streakDays).toBe(1);
  });
});
