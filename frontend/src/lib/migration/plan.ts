import type { GuestProgress, GuestSession } from '../store';

export interface MigrationPlan {
  progressCount: number;
  sessionCount: number;
  progress: GuestProgress[];
  sessions: GuestSession[];
}

export function buildMigrationPlan(input: {
  progress: Record<string, GuestProgress>;
  sessions: GuestSession[];
}): MigrationPlan {
  const progress = Object.values(input.progress);
  return {
    progressCount: progress.length,
    sessionCount: input.sessions.length,
    progress,
    sessions: input.sessions,
  };
}

export function migrationIsEmpty(plan: MigrationPlan): boolean {
  return plan.progressCount === 0 && plan.sessionCount === 0;
}
