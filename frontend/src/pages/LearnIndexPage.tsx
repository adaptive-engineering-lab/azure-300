import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { useDomainCounts } from '../lib/dashboard/useDomainCounts';

interface Mode {
  to: string;
  title: string;
  emoji: string;
  description: string;
  details: string;
  countKey: 'flashcard' | 'mcq' | 'code-review';
  accent: string;
}

const MODES: Mode[] = [
  {
    to: ROUTES.flashcards,
    title: 'Flashcards',
    emoji: '🧠',
    description: 'Concept and term recall with self-rating.',
    details: 'Short, focused sessions. Spaced repetition surfaces what you need to review.',
    countKey: 'flashcard',
    accent: 'ring-violet-500/40 from-violet-500/15',
  },
  {
    to: ROUTES.quiz,
    title: 'Quiz',
    emoji: '🎯',
    description: 'Multiple-choice with explanations.',
    details: 'Pick a domain, choose easy / medium / hard, optional 45-second exam timer.',
    countKey: 'mcq',
    accent: 'ring-sky-500/40 from-sky-500/15',
  },
  {
    to: ROUTES.codeReview,
    title: 'Code Review',
    emoji: '🔍',
    description: 'Spot the bug or fill the blank in real Azure ML / Foundry snippets.',
    details: 'Short Python / YAML / Bash snippets with four-option feedback. Mirrors the exam’s scenario questions.',
    countKey: 'code-review',
    accent: 'ring-emerald-500/40 from-emerald-500/15',
  },
];

export default function LearnIndexPage() {
  const { byType, loading } = useDomainCounts();

  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Pick a mode</h1>
        <p className="mt-1 text-fg-muted">
          Three ways to study. Start with whatever you have time for.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode) => (
          <Link
            key={mode.to}
            to={mode.to}
            className={[
              'group relative overflow-hidden rounded-xl bg-bg-elevated p-5 ring-1',
              mode.accent.split(' ')[0]!,
              'transition-transform hover:-translate-y-0.5',
            ].join(' ')}
          >
            <div
              aria-hidden
              className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${mode.accent.split(' ')[1]} to-transparent blur-3xl`}
            />
            <div className="relative">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl leading-none" aria-hidden>{mode.emoji}</span>
                <span className="text-xs font-medium text-fg-muted">
                  {loading ? '…' : `${byType[mode.countKey]} available`}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{mode.title}</h3>
              <p className="mt-1 text-sm font-medium text-fg">{mode.description}</p>
              <p className="mt-2 text-sm text-fg-muted">{mode.details}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
