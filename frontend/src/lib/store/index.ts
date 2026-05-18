import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storageAdapter } from '../storage/adapter';
import { STATE_KEY, SCHEMA_VERSION } from '../storage/namespace';
import { migrate } from '../storage/migrate';
import {
  DEFAULT_PREFERENCES,
  type SessionPreferences,
  type Theme,
  type SessionLength,
  type GameMode,
} from './preferences';
import { makeDefaultProfile, levelFromXp, type GuestProfile, type Level } from './profile';
import type { GuestProgress, GuestProgressMap, Rating } from './progress';
import { SESSIONS_CAP, type GuestSession, type SessionMode } from './sessions';

interface AppState {
  preferences: SessionPreferences;
  profile: GuestProfile;
  progress: GuestProgressMap;
  sessions: GuestSession[];

  setTheme: (theme: Theme) => void;
  setDefaultSessionLength: (n: SessionLength) => void;
  setDefaultStartingMode: (mode: GameMode | null) => void;
  setReducedMotion: (v: boolean | 'system') => void;
  setExamDate: (date: string | null) => void;

  recordRating: (input: {
    questionId: string;
    rating: Rating;
    nextReview: string | null;
    now?: Date;
  }) => void;

  recordSession: (input: {
    mode: SessionMode;
    topic: string | null;
    scorePct: number | null;
    durationSeconds: number | null;
    now?: Date;
  }) => void;

  addXp: (delta: number) => void;
  bumpStreakIfDue: (today?: Date) => void;
  hydrateFromServer: (input: {
    progress: GuestProgressMap;
    sessions: GuestSession[];
    profile?: Pick<GuestProfile, 'streakDays' | 'lastActive' | 'level'> | null;
  }) => void;
  reset: () => void;
}

function freshState(): Pick<AppState, 'preferences' | 'profile' | 'progress' | 'sessions'> {
  return {
    preferences: { ...DEFAULT_PREFERENCES },
    profile: makeDefaultProfile(),
    progress: {},
    sessions: [],
  };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const ad = Date.parse(a + 'T00:00:00Z');
  const bd = Date.parse(b + 'T00:00:00Z');
  return Math.round((bd - ad) / 86_400_000);
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...freshState(),

      setTheme: (theme) =>
        set((s) => ({ preferences: { ...s.preferences, theme } })),
      setDefaultSessionLength: (n) =>
        set((s) => ({ preferences: { ...s.preferences, defaultSessionLength: n } })),
      setDefaultStartingMode: (mode) =>
        set((s) => ({ preferences: { ...s.preferences, defaultStartingMode: mode } })),
      setReducedMotion: (v) =>
        set((s) => ({ preferences: { ...s.preferences, reducedMotion: v } })),
      setExamDate: (date) =>
        set((s) => ({ preferences: { ...s.preferences, examDate: date } })),

      recordRating: ({ questionId, rating, nextReview, now }) => {
        const ts = (now ?? new Date()).toISOString();
        set((s) => {
          const prev: GuestProgress = s.progress[questionId] ?? {
            questionId,
            timesSeen: 0,
            timesCorrect: 0,
            lastRating: null,
            nextReview: null,
            updatedAt: ts,
          };
          const next: GuestProgress = {
            ...prev,
            timesSeen: prev.timesSeen + 1,
            timesCorrect: prev.timesCorrect + (rating === 'correct' ? 1 : 0),
            lastRating: rating,
            nextReview,
            updatedAt: ts,
          };
          return { progress: { ...s.progress, [questionId]: next } };
        });
      },

      recordSession: ({ mode, topic, scorePct, durationSeconds, now }) => {
        const completedAt = (now ?? new Date()).toISOString();
        const newSession: GuestSession = {
          id: crypto.randomUUID(),
          mode,
          topic,
          scorePct,
          durationSeconds,
          completedAt,
        };
        set((s) => {
          const next = [newSession, ...s.sessions];
          if (next.length > SESSIONS_CAP) next.length = SESSIONS_CAP;
          return { sessions: next };
        });
      },

      addXp: (delta) =>
        set((s) => {
          const xp = Math.max(0, s.profile.xp + delta);
          const level: Level = levelFromXp(xp);
          return { profile: { ...s.profile, xp, level } };
        }),

      bumpStreakIfDue: (today) => {
        const todayIso = isoDate(today ?? new Date());
        set((s) => {
          const last = s.profile.lastActive;
          if (last === todayIso) return {};
          let streakDays = 1;
          if (last) {
            const gap = diffDays(last, todayIso);
            if (gap === 1) streakDays = s.profile.streakDays + 1;
            else if (gap <= 0) return {};
            // gap >= 2 → reset to 1
          }
          return {
            profile: {
              ...s.profile,
              streakDays,
              lastActive: todayIso,
            },
          };
        });
      },

      hydrateFromServer: ({ progress, sessions, profile }) =>
        set((s) => {
          const nextProfile: GuestProfile = profile
            ? {
                ...s.profile,
                // Take the higher streak so a fresher local bump isn't lost,
                // and keep the most-recent lastActive.
                streakDays: Math.max(s.profile.streakDays, profile.streakDays),
                lastActive:
                  !s.profile.lastActive || (profile.lastActive && profile.lastActive > s.profile.lastActive)
                    ? profile.lastActive
                    : s.profile.lastActive,
                level: (Math.max(s.profile.level, profile.level) as Level),
              }
            : s.profile;
          return {
            progress,
            sessions: sessions.slice(0, SESSIONS_CAP),
            profile: nextProfile,
          };
        }),

      reset: () => set(() => freshState()),
    }),
    {
      name: STATE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => storageAdapter),
      migrate: (state, version) => migrate(state, version) as AppState,
    },
  ),
);

export type { Theme, SessionLength, GameMode, SessionPreferences } from './preferences';
export type { GuestProfile, Level } from './profile';
export type { GuestProgress, GuestProgressMap, Rating } from './progress';
export type { GuestSession, SessionMode } from './sessions';
