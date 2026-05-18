import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthProvider';
import { useEntitlement } from '../lib/entitlement';
import { ROUTES } from '../lib/routes';
import { startCheckout, openCustomerPortal } from '../lib/billing/checkout';

export default function BillingPage() {
  const { user } = useAuth();
  const ent = useEntitlement();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const status = params.get('status');
    if (status === 'success') {
      setToast('Pro activated. It may take a few seconds to reflect here.');
      params.delete('status');
      setParams(params, { replace: true });
    } else if (status === 'canceled') {
      setToast('Checkout canceled. Nothing was charged.');
      params.delete('status');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  async function onUpgrade() {
    setError(null);
    setBusy(true);
    try {
      await startCheckout();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed.');
      setBusy(false);
    }
  }

  async function onManage() {
    setError(null);
    setBusy(true);
    try {
      await openCustomerPortal();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the portal.');
      setBusy(false);
    }
  }

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

      {toast && (
        <div className="mb-4 rounded-lg bg-accent/10 p-3 text-sm ring-1 ring-accent">{toast}</div>
      )}

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
        {ent.isPro ? (
          <button
            type="button"
            onClick={onManage}
            disabled={busy}
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
          >
            {busy ? 'Opening…' : 'Manage subscription'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onUpgrade}
            disabled={busy}
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
          >
            {busy ? 'Redirecting…' : 'Upgrade to Pro'}
          </button>
        )}
        {error && <p className="mt-2 text-xs text-error">{error}</p>}
      </div>
    </section>
  );
}
