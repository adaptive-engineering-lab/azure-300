import type { Domain } from '../questions/types';
import type { GuestProgressMap, GuestSession } from '../store';

const DOMAINS: Domain[] = ['mlops-infra', 'ml-lifecycle', 'genaiops-infra', 'genai-quality', 'genai-optimization'];

export interface DomainStat {
  domain: Domain;
  answered: number;
  correct: number;
  pct: number;
  hasEnoughData: boolean;
  weak: boolean;
}

const MIN_ANSWERS = 5;
const WEAK_THRESHOLD = 60;

export function computeDomainStats(
  progress: GuestProgressMap,
  questionDomains: Record<string, Domain>,
): DomainStat[] {
  const tally: Record<Domain, { seen: number; correct: number }> = {
    'mlops-infra': { seen: 0, correct: 0 },
    storage: { seen: 0, correct: 0 },
    compute: { seen: 0, correct: 0 },
    networking: { seen: 0, correct: 0 },
    monitoring: { seen: 0, correct: 0 },
  };
  for (const p of Object.values(progress)) {
    const dom = questionDomains[p.questionId];
    if (!dom) continue;
    tally[dom].seen += p.timesSeen;
    tally[dom].correct += p.timesCorrect;
  }
  return DOMAINS.map((domain) => {
    const t = tally[domain];
    const hasEnoughData = t.seen >= MIN_ANSWERS;
    const pct = t.seen === 0 ? 0 : Math.round((t.correct / t.seen) * 100);
    return {
      domain,
      answered: t.seen,
      correct: t.correct,
      pct,
      hasEnoughData,
      weak: hasEnoughData && pct < WEAK_THRESHOLD,
    };
  });
}

export function computeActivityCalendar(
  sessions: GuestSession[],
  today: Date = new Date(),
  weeks = 12,
): Array<{ date: string; sessionCount: number; minutes: number }> {
  const map = new Map<string, { sessionCount: number; minutes: number }>();
  for (const s of sessions) {
    const date = new Date(s.completedAt).toISOString().slice(0, 10);
    const prev = map.get(date) ?? { sessionCount: 0, minutes: 0 };
    prev.sessionCount += 1;
    prev.minutes += Math.round((s.durationSeconds ?? 0) / 60);
    map.set(date, prev);
  }
  const days: Array<{ date: string; sessionCount: number; minutes: number }> = [];
  const cursor = new Date(today);
  cursor.setUTCDate(cursor.getUTCDate() - (weeks * 7 - 1));
  for (let i = 0; i < weeks * 7; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    const existing = map.get(iso);
    days.push({ date: iso, sessionCount: existing?.sessionCount ?? 0, minutes: existing?.minutes ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
