import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../supabase';

type Status = 'loading' | 'yes' | 'no';

export function useIsAdmin(): Status {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus('no');
      return;
    }
    let cancelled = false;
    supabase()
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setStatus(data ? 'yes' : 'no');
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return status;
}
