import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ROUTES } from '../lib/routes';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // detectSessionInUrl in the client config handles the exchange automatically.
      // We just need to wait for the session to be established.
      const { data, error } = await supabase().auth.getSession();
      if (cancelled) return;
      if (error || !data.session) {
        setStatus('error');
        setMsg(error?.message ?? 'No session — the link may have expired.');
        return;
      }
      setStatus('done');
      navigate(ROUTES.home, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <section>
      {status === 'working' && <p className="text-fg-muted">Signing you in…</p>}
      {status === 'error' && (
        <>
          <h1 className="text-2xl font-bold">Sign-in failed</h1>
          <p className="mt-3 text-error">{msg}</p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.signIn, { replace: true })}
            className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          >
            Request a new link
          </button>
        </>
      )}
    </section>
  );
}
