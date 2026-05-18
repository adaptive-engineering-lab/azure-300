import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthProvider';
import { useEntitlement } from '../lib/entitlement';
import { ROUTES } from '../lib/routes';

interface Feature {
  emoji: string;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    emoji: '🎨',
    title: 'Two extra app themes',
    body: 'Solar (warm amber) and Forest (calm greens) join the standard Dark and Light themes. Pick what carries you through a study session.',
  },
  {
    emoji: '📈',
    title: 'Advanced progress stats',
    body: 'Per-difficulty accuracy and average session length on the progress dashboard, alongside the radar already there.',
  },
  {
    emoji: '📅',
    title: 'Exam countdown widget',
    body: 'Pin your scheduled exam date and see the days remaining on every home-screen visit. Turns urgent when you cross the two-week mark.',
  },
];

export default function WhatsInProPage() {
  const { user } = useAuth();
  const ent = useEntitlement();

  return (
    <section className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <p className="text-sm font-medium text-accent">Pro</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">What's in Pro?</h1>
        <p className="mt-3 text-fg-muted">
          Pro is about making the app yours — quality-of-life polish, not paywalled questions.
          Every study mode, every question, every domain is free.
        </p>
      </header>

      <ul className="space-y-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="rounded-xl bg-bg-elevated p-5 ring-1 ring-divider">
            <p className="flex items-baseline gap-3">
              <span aria-hidden className="text-2xl">{f.emoji}</span>
              <span className="text-base font-semibold">{f.title}</span>
            </p>
            <p className="mt-2 text-sm text-fg-muted">{f.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-xl bg-accent/10 p-5 ring-1 ring-accent/40">
        <p className="text-sm font-semibold text-accent">
          No study content is paywalled. Period.
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          You can pass the AI-300 exam using this app entirely for free. Pro funds the project.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {ent.isPro ? (
          <Link
            to={ROUTES.home}
            className="flex-1 rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-fg"
          >
            Back to studying →
          </Link>
        ) : (
          <Link
            to={user ? ROUTES.billing : `${ROUTES.signIn}?return_to=${encodeURIComponent(ROUTES.billing)}`}
            className="flex-1 rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-fg shadow-lg shadow-accent/20"
          >
            {user ? 'Upgrade to Pro →' : 'Sign in to upgrade →'}
          </Link>
        )}
        <Link
          to={ROUTES.home}
          className="flex-1 rounded-md bg-bg-elevated px-4 py-3 text-center text-sm font-medium ring-1 ring-divider"
        >
          Maybe later
        </Link>
      </div>
    </section>
  );
}
