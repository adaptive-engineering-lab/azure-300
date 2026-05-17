import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { DOMAINS, type Domain } from '../questions/types';

type ItemType = 'flashcard' | 'mcq' | 'code-review';

export interface DomainCounts {
  byDomain: Record<Domain, number>;
  byType: Record<ItemType, number>;
  total: number;
  loading: boolean;
  error: string | null;
}

const EMPTY: Record<Domain, number> = {
  'mlops-infra': 0,
  'ml-lifecycle': 0,
  'genaiops-infra': 0,
  'genai-quality': 0,
  'genai-optimization': 0,
};

const EMPTY_TYPES: Record<ItemType, number> = {
  flashcard: 0,
  mcq: 0,
  'code-review': 0,
};

/**
 * Fetches the question bank's domain × count breakdown in a single
 * lightweight query (id + domain only, ~6 KB for ~100 rows). Tallies
 * client-side so callers can render five domain cards without firing
 * five separate count requests.
 */
export function useDomainCounts(): DomainCounts {
  const [byDomain, setByDomain] = useState<Record<Domain, number>>(EMPTY);
  const [byType, setByType] = useState<Record<ItemType, number>>(EMPTY_TYPES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase()
      .from('questions')
      .select('domain, type')
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) {
          setError(e.message);
          setLoading(false);
          return;
        }
        const dTally: Record<Domain, number> = { ...EMPTY };
        const tTally: Record<ItemType, number> = { ...EMPTY_TYPES };
        for (const row of (data ?? []) as { domain: Domain; type: ItemType }[]) {
          if (DOMAINS.includes(row.domain)) dTally[row.domain] += 1;
          if (row.type in tTally) tTally[row.type] += 1;
        }
        setByDomain(dTally);
        setByType(tTally);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = DOMAINS.reduce((sum, d) => sum + byDomain[d], 0);
  return { byDomain, byType, total, loading, error };
}
