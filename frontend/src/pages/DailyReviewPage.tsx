import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchQuestionsByIds } from '../lib/questions/fetch';
import type { Question } from '../lib/questions/types';
import { useAppStore, type Rating } from '../lib/store';
import { computeNextReview } from '../lib/spacing';
import { findDueQuestionIds, DAILY_REVIEW_CAP } from '../lib/dashboard/due';
import { ROUTES } from '../lib/routes';
import SnippetView from '../components/SnippetView';

const OPTIONS = ['A', 'B', 'C', 'D'] as const;
type Letter = (typeof OPTIONS)[number];

interface Outcome {
  questionId: string;
  rating: Rating;
}

export default function DailyReviewPage() {
  const progress = useAppStore((s) => s.progress);
  const recordRating = useAppStore((s) => s.recordRating);
  const recordSession = useAppStore((s) => s.recordSession);
  const addXp = useAppStore((s) => s.addXp);
  const bumpStreak = useAppStore((s) => s.bumpStreakIfDue);

  const [extended, setExtended] = useState(false);
  const [items, setItems] = useState<Question[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [chosen, setChosen] = useState<Letter | string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const startedAt = useMemo(() => Date.now(), []);

  // Capture due ids at session start so mid-flight rating updates don't pull more items in.
  const dueIdsSnapshot = useMemo(() => findDueQuestionIds(progress), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sliceStart = extended ? DAILY_REVIEW_CAP : 0;
  const sliceEnd = extended ? DAILY_REVIEW_CAP * 2 : DAILY_REVIEW_CAP;
  const idsForSession = dueIdsSnapshot.slice(sliceStart, sliceEnd);
  const remainingAfter = Math.max(0, dueIdsSnapshot.length - sliceEnd);

  useEffect(() => {
    let cancelled = false;
    fetchQuestionsByIds(idsForSession)
      .then((qs) => {
        if (cancelled) return;
        const byId = new Map(qs.map((q) => [q.id, q]));
        const ordered = idsForSession.map((id) => byId.get(id)).filter((q): q is Question => !!q);
        setItems(ordered);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extended]);

  if (error) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-error">{error}</p>
        <Link to={ROUTES.home} className="mt-4 inline-flex rounded-md bg-bg-elevated px-4 py-2 text-sm">
          ← Home
        </Link>
      </section>
    );
  }
  if (!items) return <p className="text-fg-muted">Loading…</p>;
  if (items.length === 0)
    return (
      <section className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">No reviews due</h1>
          <p className="mt-2 text-fg-muted">
            Spaced repetition will surface cards here when they're scheduled. Until then, build up a
            bank of items by studying any mode.
          </p>
        </header>

        <div className="rounded-xl bg-bg-elevated p-5 ring-1 ring-divider">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            How spaced repetition works
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex gap-2">
              <span aria-hidden className="text-accent">1.</span>
              <span>You answer a question — correct, almost, or missed.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-accent">2.</span>
              <span>The system schedules the next review (1 day → 3 → 7 → 14 → 30 …).</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-accent">3.</span>
              <span>When that date arrives, the card appears here for a quick check.</span>
            </li>
          </ul>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            to={ROUTES.flashcards}
            className="flex-1 rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-fg shadow-lg shadow-accent/20"
          >
            Study flashcards →
          </Link>
          <Link
            to={ROUTES.quiz}
            className="flex-1 rounded-md bg-bg px-4 py-3 text-center text-sm font-medium ring-1 ring-divider"
          >
            Try a quiz
          </Link>
        </div>
      </section>
    );

  if (idx >= items.length) {
    return (
      <Results
        outcomes={outcomes}
        durationSeconds={Math.round((Date.now() - startedAt) / 1000)}
        remaining={remainingAfter}
        onMore={() => {
          setExtended(true);
          setIdx(0);
          setOutcomes([]);
          setFlipped(false);
          setShowFeedback(false);
          setChosen(null);
        }}
      />
    );
  }

  const item = items[idx]!;

  function commit(rating: Rating) {
    const entry = progress[item.id];
    const priorCorrect = entry?.timesCorrect ?? 0;
    recordRating({
      questionId: item.id,
      rating,
      nextReview: computeNextReview({ rating, priorTimesCorrect: priorCorrect }),
    });
    setOutcomes((o) => [...o, { questionId: item.id, rating }]);
    setFlipped(false);
    setChosen(null);
    setShowFeedback(false);
    if (idx + 1 < items!.length) {
      setIdx(idx + 1);
    } else {
      const correctCount = outcomes.filter((o) => o.rating === 'correct').length + (rating === 'correct' ? 1 : 0);
      const scorePct = Math.round((correctCount / items!.length) * 100);
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
      addXp(correctCount * 10 + 50 + (extended ? 0 : 20));
      recordSession({ mode: 'daily-review', topic: null, scorePct, durationSeconds });
      if (!extended) bumpStreak();
      setIdx(idx + 1);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div
        className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-divider"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={idx + 1}
      >
        <div className="h-full bg-accent transition-all" style={{ width: `${((idx + 1) / items.length) * 100}%` }} />
      </div>
      <p className="mb-2 text-xs uppercase tracking-wider text-fg-muted">
        Daily review · {item.type === 'flashcard' ? 'flashcard' : item.type === 'mcq' ? 'multiple choice' : 'code review'} · {idx + 1} / {items.length}
      </p>

      {item.type === 'flashcard' && (
        <FlashcardCard
          front={item.content.front}
          back={item.content.back}
          flipped={flipped}
          onFlip={() => setFlipped(true)}
          onRate={commit}
        />
      )}
      {item.type === 'mcq' && (
        <McqCard
          question={item.content.question}
          options={item.content.options}
          correct={item.content.correct}
          chosen={chosen as Letter | null}
          showFeedback={showFeedback}
          explanation={item.content.explanation}
          onPick={(letter) => {
            setChosen(letter);
            setShowFeedback(true);
          }}
          onNext={() => commit(chosen === item.content.correct ? 'correct' : 'missed')}
        />
      )}
      {item.type === 'code-review' && (
        <CodeReviewCard
          snippet={item.content.snippet}
          language={item.content.language}
          subMode={item.content.sub_mode}
          prompt={item.content.prompt}
          options={item.content.options}
          correct={item.content.correct}
          explanation={item.content.explanation}
          chosen={chosen as Letter | null}
          showFeedback={showFeedback}
          onPick={(letter) => {
            setChosen(letter);
            setShowFeedback(true);
          }}
          onNext={() => commit(chosen === item.content.correct ? 'correct' : 'missed')}
        />
      )}
    </section>
  );
}

function FlashcardCard({
  front,
  back,
  flipped,
  onFlip,
  onRate,
}: {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
  onRate: (r: Rating) => void;
}) {
  return (
    <>
      <button type="button" onClick={onFlip} className="mb-4 block w-full rounded-lg bg-bg-elevated p-6 text-left">
        <p className="text-xs uppercase tracking-wider text-fg-muted">{flipped ? 'Answer' : 'Question'}</p>
        <p className="mt-2 text-lg leading-snug">{flipped ? back : front}</p>
      </button>
      {flipped && (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onRate('missed')} className="rounded-md bg-bg-elevated px-3 py-3 text-sm font-medium text-error">Missed</button>
          <button type="button" onClick={() => onRate('almost')} className="rounded-md bg-bg-elevated px-3 py-3 text-sm font-medium text-warning">Almost</button>
          <button type="button" onClick={() => onRate('correct')} className="rounded-md bg-bg-elevated px-3 py-3 text-sm font-medium text-success">Got it</button>
        </div>
      )}
    </>
  );
}

function McqCard({
  question,
  options,
  correct,
  chosen,
  showFeedback,
  explanation,
  onPick,
  onNext,
}: {
  question: string;
  options: Record<Letter, string>;
  correct: Letter;
  chosen: Letter | null;
  showFeedback: boolean;
  explanation: string;
  onPick: (l: Letter) => void;
  onNext: () => void;
}) {
  return (
    <>
      <h2 className="text-lg font-medium leading-snug">{question}</h2>
      <div className="mt-4 grid gap-2">
        {OPTIONS.map((letter) => {
          let cls = 'bg-bg-elevated text-fg';
          if (showFeedback) {
            if (letter === correct) cls = 'bg-success/20 text-success ring-1 ring-success';
            else if (letter === chosen) cls = 'bg-error/20 text-error ring-1 ring-error';
          }
          return (
            <button key={letter} type="button" disabled={showFeedback} onClick={() => onPick(letter)} className={`flex items-start gap-3 rounded-md px-4 py-3 text-left text-sm font-medium ${cls}`}>
              <span className="font-bold">{letter}.</span>
              <span className="flex-1">{options[letter]}</span>
            </button>
          );
        })}
      </div>
      {showFeedback && (
        <div className="mt-4 rounded-md bg-bg-elevated p-4">
          <p className="text-sm"><strong>{chosen === correct ? 'Correct.' : 'Not quite.'}</strong> {explanation}</p>
          <button type="button" onClick={onNext} className="mt-4 w-full rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg">Next</button>
        </div>
      )}
    </>
  );
}

function CodeReviewCard({
  snippet,
  language,
  subMode,
  prompt,
  options,
  correct,
  explanation,
  chosen,
  showFeedback,
  onPick,
  onNext,
}: {
  snippet: string;
  language: 'python' | 'yaml' | 'bash';
  subMode: 'find-the-bug' | 'what-does-this-do' | 'fill-the-blank';
  prompt: string;
  options: Record<Letter, string>;
  correct: Letter;
  explanation: string;
  chosen: Letter | null;
  showFeedback: boolean;
  onPick: (l: Letter) => void;
  onNext: () => void;
}) {
  const themeMode = useAppStore((s) => s.preferences.theme);
  const revealedValue =
    showFeedback && subMode === 'fill-the-blank' ? options[correct] : undefined;
  return (
    <>
      <SnippetView
        snippet={snippet}
        language={language}
        themeMode={themeMode}
        revealedValue={revealedValue}
      />
      <p className="mt-4 text-sm font-medium">{prompt}</p>
      <div className="mt-3 grid gap-2">
        {OPTIONS.map((letter) => {
          let cls = 'bg-bg-elevated text-fg';
          if (showFeedback) {
            if (letter === correct) cls = 'bg-success/20 text-success ring-1 ring-success';
            else if (letter === chosen) cls = 'bg-error/20 text-error ring-1 ring-error';
          }
          return (
            <button
              key={letter}
              type="button"
              disabled={showFeedback}
              onClick={() => onPick(letter)}
              className={`flex items-start gap-3 rounded-md px-4 py-3 text-left text-sm font-medium ${cls}`}
            >
              <span className="font-bold">{letter}.</span>
              <span className="flex-1">{options[letter]}</span>
            </button>
          );
        })}
      </div>
      {showFeedback && (
        <div className="mt-4 rounded-md bg-bg-elevated p-4">
          <p className="text-sm">
            <strong>{chosen === correct ? 'Correct.' : 'Not quite.'}</strong> {explanation}
          </p>
          <button
            type="button"
            onClick={onNext}
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

function Results({
  outcomes,
  durationSeconds,
  remaining,
  onMore,
}: {
  outcomes: Outcome[];
  durationSeconds: number;
  remaining: number;
  onMore: () => void;
}) {
  const correct = outcomes.filter((o) => o.rating === 'correct').length;
  const total = outcomes.length;
  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold">Review complete</h1>
      <p className="mt-1 text-fg-muted">
        {correct} of {total} correct · {Math.max(1, Math.round(durationSeconds / 60))} min
      </p>
      {remaining > 0 ? (
        <div className="mt-6 rounded-lg bg-bg-elevated p-4">
          <p className="text-sm">{remaining} more due — review again later (no streak bonus).</p>
          <button type="button" onClick={onMore} className="mt-3 w-full rounded-md bg-bg px-4 py-2 text-sm font-medium">
            Review more
          </button>
        </div>
      ) : null}
      <div className="mt-6 flex gap-2">
        <Link to={ROUTES.home} className="flex-1 rounded-md bg-accent px-4 py-3 text-center font-semibold text-accent-fg">
          Home
        </Link>
      </div>
    </section>
  );
}
