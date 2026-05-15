import type { SupabaseClient } from '@supabase/supabase-js';
import type { GuestProfile, Level } from '../store/profile';

interface ProfileRow {
  streak_days: number;
  last_active: string | null;
  level: number;
}

export async function pullProfileFromServer(
  client: SupabaseClient,
  userId: string,
): Promise<Pick<GuestProfile, 'streakDays' | 'lastActive' | 'level'> | null> {
  const { data, error } = await client
    .from('profiles')
    .select('streak_days, last_active, level')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`pull profile failed: ${error.message}`);
  if (!data) return null;
  const row = data as ProfileRow;
  return {
    streakDays: row.streak_days,
    lastActive: row.last_active,
    level: (row.level as Level) ?? 1,
  };
}

export async function pushProfileToServer(
  client: SupabaseClient,
  userId: string,
  profile: GuestProfile,
): Promise<void> {
  const { error } = await client
    .from('profiles')
    .update({
      streak_days: profile.streakDays,
      last_active: profile.lastActive,
      level: profile.level,
    })
    .eq('id', userId);
  if (error) throw new Error(`push profile failed: ${error.message}`);
}
