import { useAppStore } from '../lib/store';

export function StreakBadge() {
  const streakDays = useAppStore((s) => s.profile.streakDays);
  return (
    <div
      className="inline-flex items-center gap-2 rounded-md bg-bg-elevated px-3 py-2 text-sm"
      aria-label={`Current streak: ${streakDays} day${streakDays === 1 ? '' : 's'}`}
    >
      <span aria-hidden>🔥</span>
      <span className="font-semibold">{streakDays}</span>
      <span className="text-fg-muted">day streak</span>
    </div>
  );
}
