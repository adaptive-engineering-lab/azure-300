import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth/AuthProvider';

export type Plan = 'free' | 'pro';
export type SubscriptionStatus =
  | 'incomplete'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'trialing';

export interface Entitlement {
  plan: Plan;
  status: SubscriptionStatus;
  isPro: boolean;
  currentPeriodEnd: string | null;
}

export const FREE_ENTITLEMENT: Entitlement = {
  plan: 'free',
  status: 'active',
  isPro: false,
  currentPeriodEnd: null,
};

const POLLING_INTERVAL_MS = 5 * 60 * 1000;

export function isProActive(plan: Plan, status: SubscriptionStatus): boolean {
  if (plan !== 'pro') return false;
  return status === 'active' || status === 'trialing';
}

export function useEntitlement(): Entitlement {
  const { user } = useAuth();
  const [ent, setEnt] = useState<Entitlement>(FREE_ENTITLEMENT);

  useEffect(() => {
    if (!user) {
      setEnt(FREE_ENTITLEMENT);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const { data, error } = await supabase()
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const plan = data.plan as Plan;
      const status = data.status as SubscriptionStatus;
      setEnt({
        plan,
        status,
        isPro: isProActive(plan, status),
        currentPeriodEnd: data.current_period_end,
      });
    };
    refresh();
    const id = setInterval(refresh, POLLING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  return ent;
}
