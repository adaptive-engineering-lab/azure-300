import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ROUTES } from '../lib/routes';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setErrorMsg('Enter a valid email address.');
      setStatus('error');
      return;
    }
    setStatus('sending');
    setErrorMsg(null);
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${ROUTES.authCallback}` },
    });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <section className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-3 text-fg-muted">
          We sent a sign-in link to <strong className="text-fg">{email}</strong>. Tap the link to
          finish signing in.
        </p>
        <p className="mt-3 text-sm text-fg-muted">
          Didn't get it within a minute?{' '}
          <button
            type="button"
            className="text-accent underline"
            onClick={() => {
              setStatus('idle');
            }}
          >
            Try again
          </button>
          .
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-md">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-fg-muted">
          We'll email you a one-tap sign-in link. No password to remember.
        </p>
      </header>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="block font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-divider bg-bg px-3 py-2 text-fg"
            placeholder="you@example.com"
          />
        </label>
        {errorMsg && (
          <p className="text-sm text-error" role="alert">
            {errorMsg}
          </p>
        )}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full rounded-md bg-accent px-4 py-3 text-base font-semibold text-accent-fg disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Send magic link'}
        </button>
      </form>
      <p className="mt-6 text-sm text-fg-muted">
        Not ready?{' '}
        <Link to={ROUTES.home} className="text-accent underline">
          Keep playing as a guest
        </Link>
        .
      </p>
    </section>
  );
}
