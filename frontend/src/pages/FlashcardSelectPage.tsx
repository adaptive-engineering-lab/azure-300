import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DOMAINS, DOMAIN_LABELS, type Domain } from '../lib/questions/types';
import { useAppStore, type SessionLength } from '../lib/store';
import { ROUTES } from '../lib/routes';

const LENGTHS: SessionLength[] = [10, 20, 30];

export default function FlashcardSelectPage() {
  const navigate = useNavigate();
  const defaultLength = useAppStore((s) => s.preferences.defaultSessionLength);
  const [domain, setDomain] = useState<Domain | 'all'>('all');
  const [length, setLength] = useState<SessionLength>(defaultLength);

  function start() {
    const params = new URLSearchParams({ length: String(length) });
    if (domain !== 'all') params.set('domain', domain);
    navigate(`${ROUTES.flashcards}/session?${params.toString()}`);
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <p className="mt-1 text-fg-muted">Pick a topic and a length, then start studying.</p>
      </header>

      <fieldset className="rounded-lg bg-bg-elevated p-4">
        <legend className="px-1 text-sm font-semibold text-fg-muted">Domain</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setDomain('all')}
            aria-pressed={domain === 'all'}
            className={[
              'rounded-md px-3 py-2 text-left text-sm font-medium',
              domain === 'all' ? 'bg-accent text-accent-fg' : 'bg-bg text-fg',
            ].join(' ')}
          >
            Random mix (all)
          </button>
          {DOMAINS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              aria-pressed={domain === d}
              className={[
                'rounded-md px-3 py-2 text-left text-sm font-medium',
                domain === d ? 'bg-accent text-accent-fg' : 'bg-bg text-fg',
              ].join(' ')}
            >
              {DOMAIN_LABELS[d]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4 rounded-lg bg-bg-elevated p-4">
        <legend className="px-1 text-sm font-semibold text-fg-muted">Cards in this session</legend>
        <div className="mt-2 flex gap-2">
          {LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLength(n)}
              aria-pressed={length === n}
              className={[
                'flex-1 rounded-md px-3 py-2 text-sm font-medium',
                length === n ? 'bg-accent text-accent-fg' : 'bg-bg text-fg',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={start}
        className="mt-6 w-full rounded-md bg-accent px-4 py-3 text-base font-semibold text-accent-fg"
      >
        Start session
      </button>
    </section>
  );
}
