import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/routes';

/**
 * Placeholder for the Code Review study mode. The full implementation
 * lands with feature 006-code-review-mode (find-the-bug,
 * what-does-this-do, fill-the-blank sub-modes over Python / YAML /
 * Bash snippets). Until then, this page exists so the `/learn/code-review`
 * route resolves cleanly (FR-002 / FR-003 in spec 002).
 */
export default function CodeReviewPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Code Review</h1>
        <p className="mt-1 text-fg-muted">Coming soon.</p>
      </header>
      <div className="rounded-xl bg-bg-elevated p-5 ring-1 ring-divider">
        <p className="text-fg">
          Code Review will show short Python, YAML, and Bash snippets from
          Azure ML, Azure AI Foundry, and GitHub Actions. You'll be asked
          to spot a deliberate bug, predict what a correct snippet does, or
          fill in a missing value — the same cognitive skill the AI-300
          exam tests.
        </p>
        <p className="mt-3 text-sm text-fg-muted">
          This mode ships with feature 006. For now, try Flashcards or
          Quiz from the mode selector.
        </p>
        <div className="mt-4">
          <Link
            to={ROUTES.learn}
            className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
          >
            Back to modes
          </Link>
        </div>
      </div>
    </section>
  );
}
