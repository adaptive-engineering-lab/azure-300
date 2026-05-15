import type { SupabaseClient } from '@supabase/supabase-js';
import {
  useAppStore,
  type GuestProgressMap,
  type GuestSession,
  type Rating,
  type SessionMode,
} from '../store';
import { SESSIONS_CAP } from '../store/sessions';
import { pullProfileFromServer } from './syncProfile';

interface ProgressRow {
  question_id: string;
  times_seen: number;
  times_correct: number;
  last_rating: Rating | null;
  next_review: string | null;
  updated_at: string;
}

interface SessionRow {
  id: string;
  mode: SessionMode;
  topic: string | null;
  score_pct: number | null;
  duration_seconds: number | null;
  completed_at: string;
}

export async function hydrateStoreFromServer(
  client: SupabaseClient,
  userId: string,
): Promise<{ progressCount: number; sessionCount: number }> {
  const [progressRes, sessionsRes, profile] = await Promise.all([
    client
      .from('user_progress')
      .select('question_id, times_seen, times_correct, last_rating, next_review, updated_at')
      .eq('user_id', userId),
    client
      .from('sessions')
      .select('id, mode, topic, score_pct, duration_seconds, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(SESSIONS_CAP),
    pullProfileFromServer(client, userId),
  ]);
  if (progressRes.error) throw new Error(`hydrate progress failed: ${progressRes.error.message}`);
  if (sessionsRes.error) throw new Error(`hydrate sessions failed: ${sessionsRes.error.message}`);

  const progress: GuestProgressMap = {};
  for (const row of (progressRes.data ?? []) as ProgressRow[]) {
    progress[row.question_id] = {
      questionId: row.question_id,
      timesSeen: row.times_seen,
      timesCorrect: row.times_correct,
      lastRating: row.last_rating,
      nextReview: row.next_review,
      updatedAt: row.updated_at,
    };
  }

  const sessions: GuestSession[] = ((sessionsRes.data ?? []) as SessionRow[]).map((r) => ({
    id: r.id,
    mode: r.mode,
    topic: r.topic,
    scorePct: r.score_pct,
    durationSeconds: r.duration_seconds,
    completedAt: r.completed_at,
  }));

  useAppStore.getState().hydrateFromServer({ progress, sessions, profile });

  return { progressCount: Object.keys(progress).length, sessionCount: sessions.length };
}
