import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchQuestions } from '../lib/questions/fetch';
import type { FlashcardQuestion, Domain } from '../lib/questions/types';
import { useAppStore, type Rating } from '../lib/store';
import { computeNextReview } from '../lib/spacing';
import { ROUTES } from '../lib/routes';

interface RatingCount {
  correct: number;
  almost: number;
  missed: number;
}

export default function FlashcardSessionPage() {
  const [params] = useSearchParams();
  const length = Math.max(1, Math.min(50, Number(params.get('length') ?? 20)));
  const domain = (params.get('domain') as Domain | null) ?? undefined;

  const [cards, setCards] = useState<FlashcardQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState<RatingCount>({ correct: 0, almost: 0, missed: 0 });
  const startedAt = useMemo(() => Date.now(), []);

  const progress = useAppStore((s) => s.progress);
  const recordRating = useAppStore((s) => s.recordRating);
  const recordSession = useAppStore((s) => s.recordSession);
  const addXp = useAppStore((s) => s.addXp);
  const bumpStreak = useAppStore((s) => s.bumpStreakIfDue);

  useEffect(() => {
    let cancelled = false;
    fetchQuestions({ type: 'flashcard', domain })
      .then((all) => {
        if (cancelled) return;
        if (all.length === 0) {
          setError('No flashcards available for this topic.');
          setCards([]);
          return;
        }
        const sequenced = sequenceForSession(all as FlashcardQuestion[], progress, length);
        setCards(sequenced);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // intentionally exclude `progress` — we want a snapshot at session start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, length]);

  if (error) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-error">{error}</p>
        <Link to={ROUTES.flashcards} className="mt-4 inline-flex rounded-md bg-bg-elevated px-4 py-2 text-sm">
          ← Back
        </Link>
      </section>
    );
  }

  if (!cards) return <p className="text-fg-muted">Loading…</p>;
  if (cards.length === 0) return null;

  if (idx >= cards.length) {
    // Session complete
    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    return <ResultsScreen counts={counts} durationSeconds={durationSeconds} />;
  }

  const card = cards[idx]!;

  function rate(rating: Rating) {
    const entry = progress[card.id];
    const priorCorrect = entry?.timesCorrect ?? 0;
    const nextReview = computeNextReview({ rating, priorTimesCorrect: priorCorrect });
    recordRating({ questionId: card.id, rating, nextReview });
    setCounts((c) => ({ ...c, [rating]: c[rating] + 1 }));
    setFlipped(false);
    if (idx + 1 < cards!.length) {
      setIdx(idx + 1);
    } else {
      // last card
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
      const total = cards!.length;
      const scorePct = Math.round(((counts.correct + (rating === 'correct' ? 1 : 0)) / total) * 100);
      addXp(counts.correct * 10 + counts.almost * 5 + (rating === 'correct' ? 10 : rating === 'almost' ? 5 : 0) + 50);
      recordSession({
        mode: 'flashcards',
        topic: domain ?? null,
        scorePct,
        durationSeconds,
      });
      bumpStreak();
      setIdx(idx + 1);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div
        className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-divider"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={cards.length}
        aria-valuenow={idx + 1}
        aria-label={`Card ${idx + 1} of ${cards.length}`}
      >
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${((idx + 1) / cards.length) * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        className="mb-4 block w-full rounded-lg bg-bg-elevated p-6 text-left transition-colors hover:bg-divider"
      >
        <p className="text-xs uppercase tracking-wider text-fg-muted">{flipped ? 'Answer' : 'Question'}</p>
        <p className="mt-2 text-lg leading-snug">{flipped ? card.content.back : card.content.front}</p>
        {!flipped && (
          <p className="mt-4 text-sm text-fg-muted">Tap to reveal the answer.</p>
        )}
      </button>

      {flipped && (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => rate('missed')}
            className="rounded-md bg-bg-elevated px-3 py-3 text-sm font-medium text-error"
          >
            Missed
          </button>
          <button
            type="button"
            onClick={() => rate('almost')}
            className="rounded-md bg-bg-elevated px-3 py-3 text-sm font-medium text-warning"
          >
            Almost
          </button>
          <button
            type="button"
            onClick={() => rate('correct')}
            className="rounded-md bg-bg-elevated px-3 py-3 text-sm font-medium text-success"
          >
            Got it
          </button>
        </div>
      )}
    </section>
  );
}

function ResultsScreen({ counts, durationSeconds }: { counts: RatingCount; durationSeconds: number }) {
  const total = counts.correct + counts.almost + counts.missed;
  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold">Session complete</h1>
      <p className="mt-1 text-fg-muted">
        {total} card{total === 1 ? '' : 's'} in {Math.max(1, Math.round(durationSeconds / 60))} min
      </p>
      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        <Tile label="Got it" value={counts.correct} colorClass="text-success" />
        <Tile label="Almost" value={counts.almost} colorClass="text-warning" />
        <Tile label="Missed" value={counts.missed} colorClass="text-error" />
      </div>
      <div className="mt-6 flex gap-2">
        <Link
          to={ROUTES.flashcards}
          className="flex-1 rounded-md bg-bg-elevated px-4 py-3 text-center font-medium"
        >
          Study more
        </Link>
        <Link
          to={ROUTES.home}
          className="flex-1 rounded-md bg-accent px-4 py-3 text-center font-semibold text-accent-fg"
        >
          Home
        </Link>
      </div>
    </section>
  );
}

function Tile({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="rounded-lg bg-bg-elevated p-4">
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-fg-muted">{label}</p>
    </div>
  );
}

export function sequenceForSession(
  cards: FlashcardQuestion[],
  progress: Record<string, { nextReview: string | null }>,
  length: number,
): FlashcardQuestion[] {
  const today = new Date().toISOString().slice(0, 10);
  const due: FlashcardQuestion[] = [];
  const fresh: FlashcardQuestion[] = [];
  for (const c of cards) {
    const p = progress[c.id];
    if (p && p.nextReview && p.nextReview <= today) due.push(c);
    else fresh.push(c);
  }
  shuffle(due);
  shuffle(fresh);
  const result = [...due, ...fresh];
  return result.slice(0, length);
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
