import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchQuestions } from '../lib/questions/fetch';
import type { ProductIdQuestion } from '../lib/questions/types';
import { useAppStore } from '../lib/store';
import { computeNextReview } from '../lib/spacing';
import { ROUTES } from '../lib/routes';

const ALL_CATEGORIES = [
  'Networking',
  'Security',
  'Compute',
  'Storage',
  'Identity',
  'Monitoring',
  'Database',
  'Integration',
] as const;

const COUNTS = [5, 10, 20] as const;

interface AnsweredItem {
  question: ProductIdQuestion;
  chosen: string;
  correct: string;
}

export default function ProductIdPage() {
  const [count, setCount] = useState<5 | 10 | 20>(10);
  const [items, setItems] = useState<ProductIdQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answered, setAnswered] = useState<AnsweredItem[]>([]);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const startedAt = useMemo(() => Date.now(), [started]);

  const progress = useAppStore((s) => s.progress);
  const recordRating = useAppStore((s) => s.recordRating);
  const recordSession = useAppStore((s) => s.recordSession);
  const addXp = useAppStore((s) => s.addXp);
  const bumpStreak = useAppStore((s) => s.bumpStreakIfDue);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    fetchQuestions({ type: 'product-id' })
      .then((all) => {
        if (cancelled) return;
        const arr = [...(all as ProductIdQuestion[])];
        shuffle(arr);
        setItems(arr.slice(0, count));
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [started, count]);

  useEffect(() => {
    if (items && idx < items.length) {
      setCurrentOptions(buildOptions(items[idx]!));
    }
  }, [items, idx]);

  if (!started) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Product ID</h1>
          <p className="mt-1 text-fg-muted">
            Match Azure service names to their categories. Quick recognition drill.
          </p>
        </header>
        <fieldset className="rounded-lg bg-bg-elevated p-4">
          <legend className="px-1 text-sm font-semibold text-fg-muted">Number of items</legend>
          <div className="mt-2 flex gap-2">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                aria-pressed={count === n}
                className={[
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium',
                  count === n ? 'bg-accent text-accent-fg' : 'bg-bg text-fg',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-6 w-full rounded-md bg-accent px-4 py-3 text-base font-semibold text-accent-fg"
        >
          Start
        </button>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-error">{error}</p>
        <Link to={ROUTES.productId} className="mt-4 inline-flex rounded-md bg-bg-elevated px-4 py-2 text-sm">
          ← Back
        </Link>
      </section>
    );
  }
  if (!items) return <p className="text-fg-muted">Loading…</p>;
  if (items.length === 0) return <p className="text-fg-muted">No items available.</p>;

  if (idx >= items.length) {
    const correctCount = answered.filter((a) => a.chosen === a.correct).length;
    return <ResultsScreen answered={answered} correctCount={correctCount} totalElapsed={Math.round((Date.now() - startedAt) / 1000)} />;
  }

  const item = items[idx]!;
  const options = currentOptions.length > 0 ? currentOptions : buildOptions(item);

  function submit(category: string) {
    if (showFeedback) return;
    setChosen(category);
    setShowFeedback(true);
    const correctCategory = item.content.category;
    const isCorrect = category === correctCategory;
    const entry = progress[item.id];
    const priorCorrect = entry?.timesCorrect ?? 0;
    const rating = isCorrect ? 'correct' : 'missed';
    recordRating({
      questionId: item.id,
      rating,
      nextReview: computeNextReview({ rating, priorTimesCorrect: priorCorrect }),
    });
    setAnswered((a) => [...a, { question: item, chosen: category, correct: correctCategory }]);
  }

  function next() {
    setShowFeedback(false);
    setChosen(null);
    if (idx + 1 < items!.length) {
      setIdx(idx + 1);
    } else {
      const correctCount = answered.filter((a) => a.chosen === a.correct).length;
      const scorePct = Math.round((correctCount / items!.length) * 100);
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
      addXp(correctCount * 10 + 50);
      recordSession({ mode: 'product-id', topic: null, scorePct, durationSeconds });
      bumpStreak();
      setIdx(idx + 1);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="mb-2 text-sm text-fg-muted">
        Item {idx + 1} / {items.length}
      </div>
      <div className="rounded-lg bg-bg-elevated p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-fg-muted">Which category?</p>
        <h2 className="mt-2 text-2xl font-bold">{item.content.service_name}</h2>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {options.map((cat) => {
          let cls = 'bg-bg-elevated text-fg';
          if (showFeedback) {
            if (cat === item.content.category) cls = 'bg-success/20 text-success ring-1 ring-success';
            else if (cat === chosen) cls = 'bg-error/20 text-error ring-1 ring-error';
          }
          return (
            <button
              key={cat}
              type="button"
              disabled={showFeedback}
              onClick={() => submit(cat)}
              className={`rounded-md px-3 py-3 text-sm font-medium ${cls}`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="mt-4 rounded-md bg-bg-elevated p-4">
          <p className="text-sm">
            <strong>
              {chosen === item.content.category ? 'Correct.' : 'Not quite.'}
            </strong>{' '}
            {item.content.description}
          </p>
          {chosen !== item.content.category && item.content.common_confusions && item.content.common_confusions.length > 0 && (
            <p className="mt-2 text-xs text-fg-muted">
              Often confused with: {item.content.common_confusions.join(', ')}
            </p>
          )}
          <button
            type="button"
            onClick={next}
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

function ResultsScreen({
  answered,
  correctCount,
  totalElapsed,
}: {
  answered: AnsweredItem[];
  correctCount: number;
  totalElapsed: number;
}) {
  const missed = answered.filter((a) => a.chosen !== a.correct);
  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold">Results</h1>
      <p className="mt-1 text-fg-muted">
        {correctCount} of {answered.length} correct in{' '}
        {Math.max(1, Math.round(totalElapsed / 60))} min
      </p>
      {missed.length > 0 && (
        <div className="mt-6 rounded-lg bg-bg-elevated p-4">
          <h2 className="text-sm font-semibold">Services you missed</h2>
          <ul className="mt-3 space-y-2">
            {missed.map((m) => (
              <li key={m.question.id} className="text-sm">
                <strong>{m.question.content.service_name}</strong> →{' '}
                <span className="text-success">{m.correct}</span>{' '}
                <span className="text-fg-muted">(you picked {m.chosen})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 flex gap-2">
        <Link
          to={ROUTES.productId}
          className="flex-1 rounded-md bg-bg-elevated px-4 py-3 text-center font-medium"
        >
          Again
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

export function buildOptions(item: ProductIdQuestion): string[] {
  const correct = item.content.category;
  const candidates = new Set<string>([correct]);
  for (const conf of item.content.common_confusions ?? []) {
    if (candidates.size >= 4) break;
    const guess = ALL_CATEGORIES.find((c) => conf.toLowerCase().includes(c.toLowerCase()));
    if (guess) candidates.add(guess);
  }
  // Fill remaining slots randomly from ALL_CATEGORIES.
  const pool = ALL_CATEGORIES.filter((c) => !candidates.has(c));
  shuffle(pool);
  for (const c of pool) {
    if (candidates.size >= 4) break;
    candidates.add(c);
  }
  const result = Array.from(candidates);
  shuffle(result);
  return result;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
