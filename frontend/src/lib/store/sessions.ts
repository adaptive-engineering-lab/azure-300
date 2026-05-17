export type SessionMode = 'flashcards' | 'mcq' | 'code-review' | 'daily-review';

export interface GuestSession {
  id: string;
  mode: SessionMode;
  topic: string | null;
  scorePct: number | null;
  durationSeconds: number | null;
  completedAt: string; // ISO timestamp
}

export const SESSIONS_CAP = 500;
