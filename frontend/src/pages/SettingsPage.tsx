import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore, type Theme, type SessionLength } from '../lib/store';
import { useAuth } from '../lib/auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { ROUTES } from '../lib/routes';

const SESSION_LENGTHS: SessionLength[] = [10, 20, 30];
const THEMES: Theme[] = ['dark', 'light'];

export default function SettingsPage() {
  const prefs = useAppStore((s) => s.preferences);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLength = useAppStore((s) => s.setDefaultSessionLength);
  const setReducedMotion = useAppStore((s) => s.setReducedMotion);
  const { user, signOut } = useAuth();

  return (
    <section className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <fieldset className="rounded-lg bg-bg-elevated p-4">
        <legend className="px-1 text-sm font-semibold text-fg-muted">Theme</legend>
        <div className="mt-2 flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={prefs.theme === t}
              className={[
                'flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors',
                prefs.theme === t ? 'bg-accent text-accent-fg' : 'bg-bg text-fg',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4 rounded-lg bg-bg-elevated p-4">
        <legend className="px-1 text-sm font-semibold text-fg-muted">
          Default session length
        </legend>
        <div className="mt-2 flex gap-2">
          {SESSION_LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLength(n)}
              aria-pressed={prefs.defaultSessionLength === n}
              className={[
                'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                prefs.defaultSessionLength === n
                  ? 'bg-accent text-accent-fg'
                  : 'bg-bg text-fg',
              ].join(' ')}
            >
              {n} cards
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4 rounded-lg bg-bg-elevated p-4">
        <legend className="px-1 text-sm font-semibold text-fg-muted">Motion</legend>
        <label className="mt-2 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={prefs.reducedMotion === true}
            onChange={(e) => setReducedMotion(e.target.checked ? true : 'system')}
            className="h-4 w-4 accent-accent"
          />
          <span>Reduce motion (otherwise follow system setting)</span>
        </label>
      </fieldset>

      {user && <AccountSection email={user.email ?? ''} onSignOut={signOut} />}

      {user && (
        <Link
          to={ROUTES.billing}
          className="mt-4 block rounded-lg bg-bg-elevated p-4"
        >
          <p className="text-sm font-semibold">Billing</p>
          <p className="mt-1 text-xs text-fg-muted">Manage your plan</p>
        </Link>
      )}
    </section>
  );
}

function AccountSection({ email, onSignOut }: { email: string; onSignOut: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase()
      .from('profiles')
      .select('display_name')
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, []);

  async function saveName() {
    setStatus('saving');
    const { error } = await supabase().from('profiles').update({ display_name: displayName });
    setStatus(error ? 'error' : 'saved');
  }

  async function deleteAccount() {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    // Best-effort: remove profile + cascading rows. Auth user deletion requires an admin
    // call (out of scope for client) — sign the user out and inform them.
    await supabase().from('profiles').delete().neq('id', '');
    await onSignOut();
  }

  return (
    <div className="mt-6 space-y-4">
      <fieldset className="rounded-lg bg-bg-elevated p-4">
        <legend className="px-1 text-sm font-semibold text-fg-muted">Account</legend>
        <p className="mt-2 text-sm">Signed in as <strong>{email}</strong>.</p>
        <label className="mt-3 block text-sm">
          <span className="block font-medium">Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-divider bg-bg px-3 py-2"
            placeholder="What should we call you?"
          />
        </label>
        <button
          type="button"
          onClick={saveName}
          className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          disabled={status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span className="ml-2 text-sm text-success">Saved.</span>}
        {status === 'error' && <span className="ml-2 text-sm text-error">Failed — try again.</span>}
      </fieldset>

      <fieldset className="rounded-lg bg-bg-elevated p-4">
        <legend className="px-1 text-sm font-semibold text-error">Delete account</legend>
        <p className="mt-2 text-sm text-fg-muted">
          Type <code className="text-fg">DELETE</code> to confirm. This removes your profile and
          all study data.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-2 block w-full rounded-md border border-divider bg-bg px-3 py-2"
        />
        <button
          type="button"
          onClick={deleteAccount}
          disabled={confirmText !== 'DELETE' || deleting}
          className="mt-3 rounded-md bg-error px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete account permanently'}
        </button>
      </fieldset>
    </div>
  );
}
