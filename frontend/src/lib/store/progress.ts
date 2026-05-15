export type Rating = 'correct' | 'almost' | 'missed';

export interface GuestProgress {
  questionId: string;
  timesSeen: number;
  timesCorrect: number;
  lastRating: Rating | null;
  nextReview: string | null; // YYYY-MM-DD
  updatedAt: string; // ISO timestamp
}

export type GuestProgressMap = Record<string, GuestProgress>;
