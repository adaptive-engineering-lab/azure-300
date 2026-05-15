import { useAppStore } from '../lib/store';

const THRESHOLDS = { 1: 500, 2: 2000, 3: 5000, 4: 5000 } as const;

export function XpBadge() {
  const xp = useAppStore((s) => s.profile.xp);
  const level = useAppStore((s) => s.profile.level);
  const target = THRESHOLDS[level];
  const pct = Math.min(100, Math.round((xp / target) * 100));

  return (
    <div className="rounded-md bg-bg-elevated px-3 py-2 text-sm" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">Level {level}</span>
        <span className="text-fg-muted">{xp} XP</span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-divider"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Level progress: ${pct}%`}
      >
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
