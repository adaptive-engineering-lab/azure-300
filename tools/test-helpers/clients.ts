import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { loadSeedEnv } from '../seed/lib/env.js';

export function anonClient(): SupabaseClient {
  const { supabaseUrl, anonKey } = loadSeedEnv();
  return createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
}

export function serviceRoleClient(): SupabaseClient {
  const { supabaseUrl, serviceRoleKey } = loadSeedEnv();
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Returns a client signed in as the given test user. Caller is responsible
 * for ensuring the user exists (see test-helpers/users.ts).
 */
export async function userClient(email: string, password: string): Promise<SupabaseClient> {
  const { supabaseUrl, anonKey } = loadSeedEnv();
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`userClient sign-in failed for ${email}: ${error.message}`);
  return client;
}
