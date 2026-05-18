import { useAppStore } from '../lib/store';
import { useEntitlement } from '../lib/entitlement';

/**
 * Days-until-exam widget. Pro-only and shown only when the user
 * has set an exam date in /settings. Free users and Pro users
 * without a configured date see nothing.
 */
export default function ExamCountdownWidget() {
  const examDate = useAppStore((s) => s.preferences.examDate);
  const ent = useEntitlement();

  if (!ent.isPro || !examDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${examDate}T00:00:00`);
  const ms = target.getTime() - today.getTime();
  const days = Math.round(ms / 86_400_000);

  let label: string;
  let tone: 'normal' | 'urgent' | 'past';
  if (days < 0) {
    label = `Exam was ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
    tone = 'past';
  } else if (days === 0) {
    label = 'Exam is today';
    tone = 'urgent';
  } else if (days === 1) {
    label = 'Exam is tomorrow';
    tone = 'urgent';
  } else {
    label = `${days} days until exam`;
    tone = days <= 14 ? 'urgent' : 'normal';
  }

  return (
    <div
      className={[
        'rounded-lg p-4 ring-1',
        tone === 'urgent'
          ? 'bg-warning/10 text-warning ring-warning/40'
          : tone === 'past'
            ? 'bg-bg-elevated text-fg-muted ring-divider'
            : 'bg-accent/10 text-accent ring-accent/40',
      ].join(' ')}
    >
      <p className="text-xs uppercase tracking-wider opacity-80">AI-300</p>
      <p className="mt-1 text-lg font-bold">{label}</p>
      <p className="mt-1 text-xs opacity-80">
        {new Date(`${examDate}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}
