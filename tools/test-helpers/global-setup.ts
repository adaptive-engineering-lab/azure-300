import { serviceRoleClient } from './clients.js';

/**
 * Vitest globalSetup. Fails fast with an actionable message if the local
 * Supabase stack isn't reachable, so contributors don't waste time chasing
 * confusing test errors that all stem from "you didn't run `supabase start`".
 */
export default async function globalSetup(): Promise<void> {
  let client;
  try {
    client = serviceRoleClient();
  } catch (e) {
    throw new Error(
      `Test environment not configured. ${(e as Error).message}\n` +
        `Run: cp tools/.env.example tools/.env.local and fill in keys from \`supabase start\`.`,
    );
  }

  const { error } = await client.from('questions').select('id', { count: 'exact', head: true });
  if (error) {
    throw new Error(
      `Supabase stack not reachable or migrations not applied: ${error.message}\n` +
        `Run: supabase start (and supabase db reset if migrations changed).`,
    );
  }
}
