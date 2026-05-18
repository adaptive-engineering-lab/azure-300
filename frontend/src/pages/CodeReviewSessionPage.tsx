import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchQuestions } from '../lib/questions/fetch';
import { pickWithDifficultyPreference } from '../lib/questions/pick';
import type {
  CodeReviewQuestion,
  CodeReviewSubMode,
  Domain,
} from '../lib/questions/types';
import { useAppStore } from '../lib/store';
import { computeNextReview } from '../lib/spacing';
import { ROUTES } from '../lib/routes';
import SnippetView from '../components/SnippetView';

const OPTIONS = ['A', 'B', 'C', 'D'] as const;
type Letter = (typeof OPTIONS)[number];

const SUB_MODE_LABEL: Record<CodeReviewSubMode, string> = {
  'find-the-bug': 'Find the bug',
  'what-does-this-do': 'What does this do?',
  'fill-the-blank': 'Fill the blank',
};

const RESUME_KEY = 'ai300game.v1.codeReview.session';
const RESUME_TTL_MS = 24 * 60 * 60 * 1000;

interface Answer {
  questionId: string;
  domain: Domain;
  chosen: Letter | null;
  correct: Letter;
}

interface Snapshot {
  ts: number;
  questionIds: string[];
  idx: number;
  answers: Answer[];
  startedAt: number;
}

function loadSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as Snapshot;
    if (Date.now() - snap.ts > RESUME_TTL_MS) {
      localStorage.removeItem(RESUME_KEY);
      return null;
    }
    return snap;
  } catch {
    return null;
  }
}

function saveSnapshot(snap: Omit<Snapshot, 'ts'>) {
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify({ ...snap, ts: Date.now() }));
  } catch {
    /* ignore quota errors */
  }
}

function clearSnapshot() {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {
    /* ignore */
  }
}

export default function CodeReviewSessionPage() {
  const [params] = useSearchParams();
  const subMode = (params.get('sub_mode') ?? 'find-the-bug') as CodeReviewSubMode;
  const difficulty = Number(params.get('difficulty') ?? 2) as 1 | 2 | 3;
  const count = Number(params.get('count') ?? 5);
  const domain = params.get('domain') as Domain | null;
  const themeMode = useAppStore((s) => s.preferences.theme);

  const [questions, setQuestions] = useState<CodeReviewQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<Letter | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const startedAtRef = useRef<number>(Date.now());

  const progress = useAppStore((s) => s.progress);
  const recordRating = useAppStore((s) => s.recordRating);
  const recordSession = useAppStore((s) => s.recordSession);
  const addXp = useAppStore((s) => s.addXp);
  const bumpStreak = useAppStore((s) => s.bumpStreakIfDue);

  useEffect(() => {
    let cancelled = false;
    fetchQuestions({ type: 'code-review', domain: domain ?? undefined })
      .then((all) => {
        if (cancelled) return;
        const filtered = (all as CodeReviewQuestion[]).filter(
          (q) => q.content.sub_mode === subMode,
        );
        if (filtered.length === 0) {
          setError(`No ${SUB_MODE_LABEL[subMode]} items match those settings.`);
          setQuestions([]);
          return;
        }

        const snap = loadSnapshot();
        if (snap && sameSet(snap.questionIds, filtered)) {
          const ordered = snap.questionIds
            .map((id) => filtered.find((q) => q.id === id))
            .filter((q): q is CodeReviewQuestion => Boolean(q));
          if (ordered.length === snap.questionIds.length) {
            setQuestions(ordered);
            setIdx(snap.idx);
            setAnswers(snap.answers);
            startedAtRef.current = snap.startedAt;
            return;
          }
        }

        const picked = pickWithDifficultyPreference(filtered, difficulty, count);
        setQuestions(picked);
        startedAtRef.current = Date.now();
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [subMode, difficulty, count, domain]);

  useEffect(() => {
    if (!questions || questions.length === 0) return;
    if (idx >= questions.length) return;
    saveSnapshot({
      questionIds: questions.map((q) => q.id),
      idx,
      answers,
      startedAt: startedAtRef.current,
    });
  }, [questions, idx, answers]);

  if (error) {
    return (
      <section className="mx-auto w-full max-w-3xl">
        <p className="text-error">{error}</p>
        <Link
          to={ROUTES.codeReview}
          className="mt-4 inline-flex rounded-md bg-bg-elevated px-4 py-2 text-sm"
        >
          ← Back
        </Link>
      </section>
    );
  }

  if (!questions) return <p className="text-fg-muted">Loading…</p>;
  if (questions.length === 0) return null;

  if (idx >= questions.length) {
    return (
      <ResultsScreen
        answers={answers}
        questions={questions}
        totalElapsed={Math.round((Date.now() - startedAtRef.current) / 1000)}
        subMode={subMode}
      />
    );
  }

  const q = questions[idx]!;
  const c = q.content;

  function submitAnswer(letter: Letter) {
    if (showFeedback) return;
    setChosen(letter);
    setShowFeedback(true);
    const isCorrect = letter === c.correct;
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
      { questionId: q.id, domain: q.domain, chosen: letter, correct: c.correct },
    ]);
  }

  function nextQuestion() {
    setShowFeedback(false);
    setChosen(null);
    if (idx + 1 < questions!.length) {
      setIdx(idx + 1);
    } else {
      const correctCount = answers.filter((a) => a.chosen === a.correct).length;
      const scorePct = Math.round((correctCount / questions!.length) * 100);
      const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
      addXp(correctCount * 10 + 50);
      recordSession({
        mode: 'code-review',
        topic: domain,
        scorePct,
        durationSeconds,
      });
      bumpStreak();
      clearSnapshot();
      setIdx(idx + 1);
    }
  }

  const revealedValue =
    showFeedback && c.sub_mode === 'fill-the-blank' ? c.options[c.correct] : undefined;

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">{SUB_MODE_LABEL[c.sub_mode]}</span>
        <span className="text-fg-muted">
          {idx + 1} / {questions.length}
        </span>
      </div>
      <div
        className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-divider"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={idx + 1}
      >
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      <SnippetView
        snippet={c.snippet}
        language={c.language}
        themeMode={themeMode}
        revealedValue={revealedValue}
      />

      <p className="mt-4 text-sm font-medium">{c.prompt}</p>

      <div className="mt-3 grid gap-2">
        {OPTIONS.map((letter) => {
          const text = c.options[letter];
          let cls = 'bg-bg-elevated text-fg';
          if (showFeedback) {
            if (letter === c.correct) cls = 'bg-success/20 text-success ring-1 ring-success';
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
            <strong>{chosen === c.correct ? 'Correct.' : 'Not quite.'}</strong>{' '}
            {c.explanation}
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

function sameSet(ids: string[], questions: CodeReviewQuestion[]): boolean {
  const have = new Set(questions.map((q) => q.id));
  return ids.every((id) => have.has(id));
}

function ResultsScreen({
  answers,
  questions,
  totalElapsed,
  subMode,
}: {
  answers: Answer[];
  questions: CodeReviewQuestion[];
  totalElapsed: number;
  subMode: CodeReviewSubMode;
}) {
  const total = answers.length;
  const correct = answers.filter((a) => a.chosen === a.correct).length;
  const scorePct = Math.round((correct / total) * 100);
  const missed = useMemo(() => {
    const byId = new Map(questions.map((q) => [q.id, q]));
    return answers
      .filter((a) => a.chosen !== a.correct)
      .map((a) => ({ a, q: byId.get(a.questionId)! }))
      .filter((x) => Boolean(x.q));
  }, [answers, questions]);
  const themeMode = useAppStore((s) => s.preferences.theme);

  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold">Results — {SUB_MODE_LABEL[subMode]}</h1>
      <p className="mt-1 text-fg-muted">
        {correct} of {total} correct — {scorePct}% in{' '}
        {Math.max(1, Math.round(totalElapsed / 60))} min
      </p>

      {missed.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold">Missed items</h2>
          <ul className="mt-3 space-y-4">
            {missed.map(({ a, q }) => (
              <li key={q.id} className="rounded-lg bg-bg-elevated p-4">
                <SnippetView
                  snippet={q.content.snippet}
                  language={q.content.language}
                  themeMode={themeMode}
                  revealedValue={
                    q.content.sub_mode === 'fill-the-blank'
                      ? q.content.options[q.content.correct]
                      : undefined
                  }
                />
                <p className="mt-3 text-xs text-fg-muted">{q.content.prompt}</p>
                <p className="mt-2 text-sm">
                  <span className="text-error">You: {a.chosen ? q.content.options[a.chosen] : '—'}</span>
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-success">Correct: {q.content.options[q.content.correct]}</span>
                </p>
                <p className="mt-2 text-xs text-fg-muted">{q.content.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <Link
          to={ROUTES.codeReview}
          className="flex-1 rounded-md bg-bg-elevated px-4 py-3 text-center font-medium"
        >
          Study another set
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
