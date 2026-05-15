import type { GuestProgress } from '../store';

interface RemoteProgress {
  question_id: string;
  times_seen: number;
  times_correct: number;
  last_rating: 'correct' | 'almost' | 'missed' | null;
  next_review: string | null;
  updated_at: string;
}

/**
 * Conflict resolution for a (user, question) pair that exists both locally
 * and remotely. Rules per spec FR-010:
 *   - prefer higher times_seen
 *   - prefer more recent last_rating (by updatedAt)
 */
export function mergeProgress(local: GuestProgress, remote: RemoteProgress): RemoteProgress {
  const winnerSeen = Math.max(local.timesSeen, remote.times_seen);
  const winnerCorrect = Math.max(local.timesCorrect, remote.times_correct);
  const localNewer = Date.parse(local.updatedAt) > Date.parse(remote.updated_at);
  return {
    question_id: remote.question_id,
    times_seen: winnerSeen,
    times_correct: Math.min(winnerCorrect, winnerSeen), // honor counts CHECK
    last_rating: localNewer ? local.lastRating : remote.last_rating,
    next_review: localNewer ? local.nextReview : remote.next_review,
    updated_at: localNewer ? local.updatedAt : remote.updated_at,
  };
}
