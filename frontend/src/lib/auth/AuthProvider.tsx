import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { useAppStore } from '../store';
import { pushProfileToServer } from '../migration/syncProfile';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setLoading(false);
      });

    const { data: sub } = supabase().auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Auto-save profile (streak/level/lastActive) to Supabase whenever it
  // changes while the user is signed in. Debounced to coalesce rapid bumps
  // (e.g. recordSession + bumpStreak fire back-to-back).
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.profile === prev.profile) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        pushProfileToServer(supabase(), userId, state.profile).catch(() => {
          // Best-effort: a failed sync shouldn't disrupt the session.
        });
      }, 400);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [session?.user?.id]);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    signOut: async () => {
      await supabase().auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
