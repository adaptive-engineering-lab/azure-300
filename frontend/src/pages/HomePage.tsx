import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { StreakBadge } from '../components/StreakBadge';
import { XpBadge } from '../components/XpBadge';
import ExamCountdownWidget from '../components/ExamCountdownWidget';
import { useAppStore } from '../lib/store';
import { findDueQuestionIds } from '../lib/dashboard/due';
import { useDomainCounts } from '../lib/dashboard/useDomainCounts';

export default function HomePage() {
  const progress = useAppStore((s) => s.progress);
  const dueCount = findDueQuestionIds(progress).length;
  const reviewedCount = Object.keys(progress).length;
  const { total: bankSize, loading: countsLoading } = useDomainCounts();

  return (
    <section className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[120%] -translate-x-1/2 bg-gradient-to-b from-accent/20 via-accent/5 to-transparent blur-3xl"
      />

      <div className="grid gap-8 xl:grid-cols-[3fr,2fr] xl:items-start xl:gap-12">
        <div>
          <header className="mb-6">
            <p className="text-sm font-medium text-accent">AI-300 Study</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight xl:text-4xl">
              Mobile-first prep for the ML Operations Engineer exam.
            </h1>
            <p className="mt-3 text-fg-muted">
              Flashcards, quizzes, and code-review drills across all five exam domains. Study in
              short sessions; come back tomorrow.
            </p>
            {!countsLoading && bankSize > 0 && (
              <p className="mt-3 text-xs text-fg-muted">
                <span className="font-semibold text-fg">{bankSize}</span> questions across 5 domains
                {reviewedCount > 0 && (
                  <>
                    {' · '}
                    <span className="font-semibold text-fg">{reviewedCount}</span> reviewed
                  </>
                )}
              </p>
            )}
          </header>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={ROUTES.learn}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-accent px-5 py-3 text-base font-semibold text-accent-fg shadow-lg shadow-accent/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Start studying →
            </Link>
            <Link
              to={ROUTES.progress}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-bg px-5 py-3 text-base font-medium text-fg ring-1 ring-divider transition-colors hover:bg-bg-elevated"
            >
              View progress
            </Link>
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <ExamCountdownWidget />
          <StreakBadge />
          <XpBadge />
          {dueCount > 0 && (
            <Link
              to={ROUTES.dailyReview}
              className="block rounded-lg bg-accent/15 p-4 ring-1 ring-accent"
            >
              <p className="text-sm font-semibold text-accent">Daily review</p>
              <p className="mt-1 text-lg font-bold">{dueCount} due today</p>
              <p className="mt-1 text-sm text-fg-muted">
                Tap to review the cards that spaced repetition surfaced for today.
              </p>
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
