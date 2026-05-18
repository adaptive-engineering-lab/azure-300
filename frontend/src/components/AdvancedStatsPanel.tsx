import { useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { useEntitlement } from '../lib/entitlement';
import { supabase } from '../lib/supabase';
import type { Domain } from '../lib/questions/types';
import ProBadge from './ProBadge';

interface QuestionMeta {
  id: string;
  difficulty: 1 | 2 | 3;
  domain: Domain;
}

interface DifficultyRow {
  difficulty: 1 | 2 | 3;
  answered: number;
  correct: number;
  pct: number;
}

const DIFF_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

/**
 * Pro-only insights panel: per-difficulty accuracy across all
 * progress entries plus average session length. Free users see a
 * preview with the `Pro` lock instead of the numbers.
 */
export default function AdvancedStatsPanel() {
  const ent = useEntitlement();
  const progress = useAppStore((s) => s.progress);
  const sessions = useAppStore((s) => s.sessions);
  const [meta, setMeta] = useState<Record<string, QuestionMeta> | null>(null);

  useEffect(() => {
    if (!ent.isPro) return;
    let cancelled = false;
    supabase()
      .from('questions')
      .select('id, difficulty, domain')
      .then(({ data }) => {
        if (cancelled || !data) return;
        const m: Record<string, QuestionMeta> = {};
        for (const row of data) m[row.id] = row as QuestionMeta;
        setMeta(m);
      });
    return () => {
      cancelled = true;
    };
  }, [ent.isPro]);

  if (!ent.isPro) {
    return (
      <div className="mt-6 rounded-lg bg-bg-elevated p-4 ring-1 ring-divider">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Advanced stats <ProBadge />
        </h2>
        <p className="mt-2 text-xs text-fg-muted">
          Per-difficulty accuracy, average session length, and weekly deltas — unlock with Pro.
        </p>
        <ul className="mt-3 grid grid-cols-3 gap-2 opacity-50">
          {([1, 2, 3] as const).map((d) => (
            <li key={d} className="rounded-md bg-bg p-3 text-center">
              <p className="text-xs text-fg-muted">{DIFF_LABEL[d]}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">—%</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const rows = computeByDifficulty(progress, meta);
  const completedSessions = sessions.filter((s) => s.durationSeconds !== null);
  const avgMinutes =
    completedSessions.length === 0
      ? 0
      : Math.round(
          completedSessions.reduce((a, s) => a + (s.durationSeconds ?? 0), 0) /
            completedSessions.length /
            60,
        );

  return (
    <div className="mt-6 rounded-lg bg-bg-elevated p-4 ring-1 ring-divider">
      <h2 className="text-sm font-semibold">Advanced stats</h2>

      <div className="mt-3">
        <p className="text-xs uppercase tracking-wider text-fg-muted">By difficulty</p>
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {rows.map((r) => (
            <li key={r.difficulty} className="rounded-md bg-bg p-3 text-center">
              <p className="text-xs text-fg-muted">{DIFF_LABEL[r.difficulty]}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {r.answered === 0 ? '—' : `${r.pct}%`}
              </p>
              <p className="text-[10px] text-fg-muted">
                {r.correct}/{r.answered}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-fg-muted">Avg session</span>
        <span className="text-sm font-semibold tabular-nums">
          {avgMinutes} min
          <span className="ml-1 text-xs text-fg-muted">({completedSessions.length} sessions)</span>
        </span>
      </div>
    </div>
  );
}

function computeByDifficulty(
  progress: Record<string, { questionId: string; timesSeen: number; timesCorrect: number }>,
  meta: Record<string, QuestionMeta> | null,
): DifficultyRow[] {
  const tally: Record<1 | 2 | 3, { answered: number; correct: number }> = {
    1: { answered: 0, correct: 0 },
    2: { answered: 0, correct: 0 },
    3: { answered: 0, correct: 0 },
  };
  if (meta) {
    for (const p of Object.values(progress)) {
      const m = meta[p.questionId];
      if (!m) continue;
      tally[m.difficulty].answered += p.timesSeen;
      tally[m.difficulty].correct += p.timesCorrect;
    }
  }
  return ([1, 2, 3] as const).map((d) => {
    const t = tally[d];
    const pct = t.answered === 0 ? 0 : Math.round((t.correct / t.answered) * 100);
    return { difficulty: d, answered: t.answered, correct: t.correct, pct };
  });
}
