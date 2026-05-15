import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return client;
}
