import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchQuestions } from '../lib/questions/fetch';
import { pickWithDifficultyPreference } from '../lib/questions/pick';
import type { McqQuestion, Domain } from '../lib/questions/types';
import { useAppStore } from '../lib/store';
import { computeNextReview } from '../lib/spacing';
import { ROUTES } from '../lib/routes';

const OPTIONS = ['A', 'B', 'C', 'D'] as const;
type Letter = (typeof OPTIONS)[number];

interface Answer {
  questionId: string;
  domain: Domain;
  chosen: Letter | null;
  correct: Letter;
  elapsedSeconds: number;
}

export default function QuizSessionPage() {
  const [params] = useSearchParams();
  const domain = params.get('domain') as Domain | null;
  const difficulty = (Number(params.get('difficulty') ?? 2) as 1 | 2 | 3);
  const count = Number(params.get('count') ?? 10);
  const timerOn = params.get('timer') === '1';

  const [questions, setQuestions] = useState<McqQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<Letter | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState(45);
  const questionStartedAt = useRef<number>(Date.now());
  const startedAt = useMemo(() => Date.now(), []);

  const progress = useAppStore((s) => s.progress);
  const recordRating = useAppStore((s) => s.recordRating);
  const recordSession = useAppStore((s) => s.recordSession);
  const addXp = useAppStore((s) => s.addXp);
  const bumpStreak = useAppStore((s) => s.bumpStreakIfDue);

  useEffect(() => {
    let cancelled = false;
    // Fetch all difficulties for the domain — difficulty is applied as
    // a soft preference in pickWithDifficultyPreference so sparse cells
    // don't starve the quiz.
    fetchQuestions({ type: 'mcq', domain: domain ?? undefined })
      .then((all) => {
        if (cancelled) return;
        if (all.length === 0) {
          setError('No questions match those settings.');
          setQuestions([]);
          return;
        }
        const picked = pickWithDifficultyPreference(all as McqQuestion[], difficulty, count);
        setQuestions(picked);
        questionStartedAt.current = Date.now();
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [domain, difficulty, count]);

  useEffect(() => {
    if (!timerOn || !questions || showFeedback) return;
    if (idx >= questions.length) return;
    setTimeLeft(45);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          submitAnswer(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, timerOn, questions, showFeedback]);

  if (error) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-error">{error}</p>
        <Link to={ROUTES.quiz} className="mt-4 inline-flex rounded-md bg-bg-elevated px-4 py-2 text-sm">
          ← Back
        </Link>
      </section>
    );
  }

  if (!questions) return <p className="text-fg-muted">Loading…</p>;
  if (questions.length === 0) return null;

  if (idx >= questions.length) {
    return <ResultsScreen answers={answers} totalElapsed={Math.round((Date.now() - startedAt) / 1000)} />;
  }

  const q = questions[idx]!;

  function submitAnswer(letter: Letter | null) {
    if (showFeedback) return;
    const elapsed = Math.round((Date.now() - questionStartedAt.current) / 1000);
    const correctLetter = q.content.correct;
    setChosen(letter);
    setShowFeedback(true);
    const isCorrect = letter === correctLetter;
    const entry = progress[q.id];
    const priorCorrect = entry?.timesCorrect ?? 0;
    const rating = isCorrect ? 'correct' : 'missed';
    recordRating({
      questionId: q.id,
      rating,
      nextReview: computeNextReview({ rating, priorTimesCorrect: priorCorrect }),
    });
    setAnswers((a) => [
      ...a,
      { questionId: q.id, domain: q.domain, chosen: letter, correct: correctLetter, elapsedSeconds: elapsed },
    ]);
  }

  function nextQuestion() {
    setShowFeedback(false);
    setChosen(null);
    questionStartedAt.current = Date.now();
    if (idx + 1 < questions!.length) {
      setIdx(idx + 1);
    } else {
      // Finish session
      const correctCount = answers.filter((a) => a.chosen === a.correct).length;
      const scorePct = Math.round((correctCount / questions!.length) * 100);
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
      addXp(correctCount * 10 + 50);
      recordSession({ mode: 'mcq', topic: domain, scorePct, durationSeconds });
      bumpStreak();
      setIdx(idx + 1);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>
          Q {idx + 1} / {questions.length}
        </span>
        {timerOn && (
          <span
            className={`tabular-nums ${timeLeft <= 10 ? 'text-error font-semibold' : 'text-fg-muted'}`}
            aria-live="polite"
          >
            {timeLeft}s
          </span>
        )}
      </div>
      <div
        className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-divider"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={idx + 1}
      >
        <div className="h-full bg-accent transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>

      <h2 className="text-lg font-medium leading-snug">{q.content.question}</h2>

      <div className="mt-4 grid gap-2">
        {OPTIONS.map((letter) => {
          const text = q.content.options[letter];
          let cls = 'bg-bg-elevated text-fg';
          if (showFeedback) {
            if (letter === q.content.correct) cls = 'bg-success/20 text-success ring-1 ring-success';
            else if (letter === chosen) cls = 'bg-error/20 text-error ring-1 ring-error';
          }
          return (
            <button
              key={letter}
              type="button"
              disabled={showFeedback}
              onClick={() => submitAnswer(letter)}
              className={`flex items-start gap-3 rounded-md px-4 py-3 text-left text-sm font-medium ${cls}`}
            >
              <span className="font-bold">{letter}.</span>
              <span className="flex-1">{text}</span>
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="mt-4 rounded-md bg-bg-elevated p-4">
          <p className="text-sm">
            <strong>
              {chosen === q.content.correct ? 'Correct.' : chosen === null ? 'Time up.' : 'Not quite.'}
            </strong>{' '}
            {q.content.explanation}
          </p>
          <button
            type="button"
            onClick={nextQuestion}
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

function ResultsScreen({ answers, totalElapsed }: { answers: Answer[]; totalElapsed: number }) {
  const correct = answers.filter((a) => a.chosen === a.correct).length;
  const total = answers.length;
  const scorePct = Math.round((correct / total) * 100);
  const byDomain = computeDomainBreakdown(answers);

  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold">Results</h1>
      <p className="mt-1 text-fg-muted">
        {correct} of {total} correct — {scorePct}% in {Math.max(1, Math.round(totalElapsed / 60))} min
      </p>

      <div className="mt-6 rounded-lg bg-bg-elevated p-4">
        <h2 className="text-sm font-semibold">By domain</h2>
        <ul className="mt-3 space-y-2">
          {byDomain.map((row) => (
            <li key={row.domain} className="flex items-center justify-between text-sm">
              <span className="capitalize">{row.domain.replace('-', ' & ')}</span>
              <span className={row.weak ? 'text-warning' : 'text-fg-muted'}>
                {row.correct}/{row.total} — {row.pct}%{row.weak ? ' · weak' : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {(() => {
        const weakDomains = byDomain.filter((r) => r.weak).map((r) => r.domain);
        if (weakDomains.length === 0) return null;
        const href = `${ROUTES.flashcards}?domains=${weakDomains.join(',')}`;
        return (
          <Link
            to={href}
            className="mt-4 block rounded-lg bg-warning/10 p-4 ring-1 ring-warning"
          >
            <p className="text-sm font-semibold text-warning">Review missed →</p>
            <p className="mt-1 text-xs text-fg-muted">
              Open a flashcard session pre-filtered to your weak {weakDomains.length === 1 ? 'domain' : 'domains'}:{' '}
              {weakDomains.map((d) => d.replace(/-/g, ' ')).join(', ')}.
            </p>
          </Link>
        );
      })()}

      <div className="mt-6 flex gap-2">
        <Link to={ROUTES.quiz} className="flex-1 rounded-md bg-bg-elevated px-4 py-3 text-center font-medium">
          Another quiz
        </Link>
        <Link to={ROUTES.home} className="flex-1 rounded-md bg-accent px-4 py-3 text-center font-semibold text-accent-fg">
          Home
        </Link>
      </div>
    </section>
  );
}

export interface DomainRow {
  domain: Domain;
  total: number;
  correct: number;
  pct: number;
  weak: boolean;
}

export function computeDomainBreakdown(answers: Answer[]): DomainRow[] {
  const map = new Map<Domain, { total: number; correct: number }>();
  for (const a of answers) {
    const prev = map.get(a.domain) ?? { total: 0, correct: 0 };
    prev.total += 1;
    if (a.chosen === a.correct) prev.correct += 1;
    map.set(a.domain, prev);
  }
  const rows: DomainRow[] = [];
  for (const [domain, v] of map) {
    const pct = Math.round((v.correct / v.total) * 100);
    rows.push({ domain, total: v.total, correct: v.correct, pct, weak: pct < 60 });
  }
  return rows;
}
