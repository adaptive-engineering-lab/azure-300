import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { ROUTES } from '../lib/routes';
import { supabase } from '../lib/supabase';
import type { Domain } from '../lib/questions/types';
import { DOMAIN_LABELS } from '../lib/questions/types';
import { computeDomainStats, computeActivityCalendar } from '../lib/dashboard/aggregate';
import { RadarChart } from '../components/RadarChart';
import { StreakCalendar } from '../components/StreakCalendar';
import AdvancedStatsPanel from '../components/AdvancedStatsPanel';

export default function ProgressPage() {
  const progress = useAppStore((s) => s.progress);
  const sessions = useAppStore((s) => s.sessions);
  const profile = useAppStore((s) => s.profile);

  const [questionDomains, setQuestionDomains] = useState<Record<string, Domain>>({});

  useEffect(() => {
    let cancelled = false;
    supabase()
      .from('questions')
      .select('id, domain')
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, Domain> = {};
        for (const row of data) map[row.id] = row.domain;
        setQuestionDomains(map);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalQuestions = Object.keys(progress).length;
  const totalSessions = sessions.length;

  if (totalSessions === 0 && totalQuestions === 0) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Your progress</h1>
          <p className="mt-1 text-fg-muted">
            Streak, accuracy, and per-domain stats appear here once you complete your first session.
          </p>
        </header>

        <div aria-hidden className="relative">
          <div className="grid grid-cols-2 gap-2 opacity-40 sm:grid-cols-4">
            <Tile label="Streak" value={3} suffix="d" />
            <Tile label="XP" value={240} />
            <Tile label="Level" value={2} />
            <Tile label="Accuracy" value={78} suffix="%" />
          </div>
          <div className="mt-4 rounded-lg bg-bg-elevated p-4 opacity-30">
            <h2 className="text-sm font-semibold">By domain</h2>
            <div className="mt-3 grid grid-cols-5 gap-1">
              {[60, 80, 45, 90, 70].map((w, i) => (
                <div key={i} className="h-2 rounded-full bg-divider">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg-muted">Preview — yours fills in as you answer.</p>
          </div>
        </div>

        <Link
          to={ROUTES.learn}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-fg shadow-lg shadow-accent/20"
        >
          Start a session →
        </Link>
      </section>
    );
  }

  const domainStats = computeDomainStats(progress, questionDomains);
  const calendar = computeActivityCalendar(sessions);
  const totalSeen = domainStats.reduce((a, s) => a + s.answered, 0);
  const totalCorrect = domainStats.reduce((a, s) => a + s.correct, 0);
  const overallPct = totalSeen === 0 ? 0 : Math.round((totalCorrect / totalSeen) * 100);
  const weakAreas = domainStats.filter((s) => s.weak);

  return (
    <section className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Your progress</h1>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Streak" value={profile.streakDays} suffix="d" />
        <Tile label="XP" value={profile.xp} />
        <Tile label="Level" value={profile.level} />
        <Tile label="Accuracy" value={overallPct} suffix="%" />
      </div>

      {sessions[0] && (
        <div className="mt-4 rounded-lg bg-bg-elevated p-4">
          <h2 className="text-sm font-semibold">Most recent session</h2>
          <p className="mt-1 text-sm">
            <span className="capitalize">{sessions[0].mode.replace('-', ' ')}</span>
            {sessions[0].scorePct !== null && (
              <>
                {' · '}
                <span className="font-medium">{sessions[0].scorePct}%</span>
              </>
            )}
            {' · '}
            <span className="text-fg-muted">{formatRelative(sessions[0].completedAt)}</span>
          </p>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-bg-elevated p-4">
        <h2 className="text-sm font-semibold">By domain</h2>
        <div className="mt-4 flex justify-center">
          <RadarChart stats={domainStats} />
        </div>
      </div>

      {weakAreas.length > 0 && (
        <div className="mt-6 rounded-lg bg-warning/10 p-4">
          <h2 className="text-sm font-semibold text-warning">Focus areas</h2>
          <ul className="mt-3 space-y-2">
            {weakAreas.map((w) => (
              <li key={w.domain} className="flex items-center justify-between text-sm">
                <span>
                  {DOMAIN_LABELS[w.domain]} — {w.pct}%
                </span>
                <Link
                  to={`${ROUTES.quiz}?domain=${w.domain}`}
                  className="rounded-md bg-bg-elevated px-3 py-1 text-xs font-medium text-fg"
                >
                  Practice
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AdvancedStatsPanel />

      <div className="mt-6 rounded-lg bg-bg-elevated p-4">
        <h2 className="text-sm font-semibold">Activity (12 weeks)</h2>
        <div className="mt-3">
          <StreakCalendar cells={calendar} />
        </div>
        <p className="mt-3 text-xs text-fg-muted">
          {totalSessions} session{totalSessions === 1 ? '' : 's'} total.
        </p>
      </div>
    </section>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Tile({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg bg-bg-elevated p-3 text-center">
      <p className="text-xs uppercase tracking-wider text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {value}
        {suffix && <span className="ml-0.5 text-base text-fg-muted">{suffix}</span>}
      </p>
    </div>
  );
}
