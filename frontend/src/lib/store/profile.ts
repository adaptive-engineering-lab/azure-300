export type Level = 1 | 2 | 3 | 4;

export interface GuestProfile {
  streakDays: number;
  xp: number;
  level: Level;
  lastActive: string | null; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
}

export function levelFromXp(xp: number): Level {
  if (xp >= 5000) return 4;
  if (xp >= 2000) return 3;
  if (xp >= 500) return 2;
  return 1;
}

export function makeDefaultProfile(now = new Date()): GuestProfile {
  return {
    streakDays: 0,
    xp: 0,
    level: 1,
    lastActive: null,
    createdAt: now.toISOString(),
  };
}
