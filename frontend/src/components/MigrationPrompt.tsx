import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth/AuthProvider';
import { useAppStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { buildMigrationPlan, migrationIsEmpty } from '../lib/migration/plan';
import { executeMigration } from '../lib/migration/execute';
import { hydrateStoreFromServer } from '../lib/migration/hydrate';

type State =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export function MigrationPrompt() {
  const { user } = useAuth();
  const progress = useAppStore((s) => s.progress);
  const sessions = useAppStore((s) => s.sessions);

  const [state, setState] = useState<State>({ kind: 'idle' });

  useEffect(() => {
    if (!user) {
      if (state.kind !== 'idle') setState({ kind: 'idle' });
      return;
    }
    if (state.kind !== 'idle') return;

    setState({ kind: 'working' });
    const plan = buildMigrationPlan({ progress, sessions });

    const run = async () => {
      try {
        if (!migrationIsEmpty(plan)) {
          await executeMigration(supabase(), user.id, plan);
        }
        await hydrateStoreFromServer(supabase(), user.id);
        setState({ kind: 'done' });
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Sync failed.',
        });
      }
    };
    void run();
  }, [user, progress, sessions, state.kind]);

  if (state.kind !== 'error') return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-2 bottom-20 z-40 mx-auto max-w-screen-md rounded-lg bg-bg-elevated p-4 shadow-lg ring-1 ring-divider"
    >
      <p className="text-sm text-error">
        {state.message}
        <button
          type="button"
          className="ml-2 underline"
          onClick={() => setState({ kind: 'idle' })}
        >
          Retry
        </button>
      </p>
    </div>
  );
}
