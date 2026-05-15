import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthProvider';
import { useEntitlement } from '../lib/entitlement';
import { ROUTES } from '../lib/routes';

export default function BillingPage() {
  const { user } = useAuth();
  const ent = useEntitlement();

  if (!user) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="mt-2 text-fg-muted">
            All study content is free. Pro is about making the app yours — quality-of-life polish,
            not paywalled questions.
          </p>
        </header>

        <div className="rounded-xl bg-bg-elevated p-5 ring-1 ring-divider">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            What's in Pro
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex gap-2">
              <span aria-hidden>✨</span>
              <span>Extra app themes beyond Dark / Light.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>📈</span>
              <span>Advanced progress stats — domain mastery curves, per-topic accuracy.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>📅</span>
              <span>Exam-day countdown widget pinned to home.</span>
            </li>
          </ul>
        </div>

        <Link
          to={ROUTES.signIn}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-fg shadow-lg shadow-accent/20"
        >
          Sign in to manage your subscription →
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Billing</h1>
      </header>

      <div className="rounded-lg bg-bg-elevated p-4">
        <p className="text-sm font-semibold">{ent.isPro ? 'Pro' : 'Free'}</p>
        <p className="mt-1 text-sm text-fg-muted">
          {ent.isPro
            ? ent.currentPeriodEnd
              ? `Renews on ${ent.currentPeriodEnd.slice(0, 10)}.`
              : 'Active.'
            : 'Free plan — no charge.'}
        </p>
        {!ent.isPro && (
          <p className="mt-3 text-sm">
            Pro is about <strong>making the app yours</strong> — no study content is paywalled.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-bg-elevated p-4">
        <h2 className="text-sm font-semibold">What's in Pro?</h2>
        <ul className="mt-3 list-inside list-disc text-sm">
          <li>Extra themes</li>
          <li>Advanced stats on the progress dashboard</li>
          <li>Exam-day countdown widget</li>
        </ul>
        {!ent.isPro && (
          <button
            type="button"
            disabled
            title="Stripe checkout wiring lands in a follow-up"
            className="mt-4 w-full rounded-md bg-accent/40 px-4 py-2 text-sm font-semibold text-accent-fg disabled:cursor-not-allowed"
          >
            Upgrade — coming soon
          </button>
        )}
      </div>
    </section>
  );
}
