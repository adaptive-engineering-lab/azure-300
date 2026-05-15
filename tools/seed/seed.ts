import { createClient } from '@supabase/supabase-js';
import { loadSeedEnv, EnvError } from './lib/env.js';
import { loadContent, DuplicateIdError, type LoadedItem } from './lib/load-content.js';
import { validateItems, formatErrorsForCli } from './lib/validate-content.js';

interface SeedResult {
  inserted: number;
  updated: number;
  unchanged: number;
}

async function main(): Promise<void> {
  const env = loadSeedEnv();
  const started = Date.now();

  const items = await loadContent();

  // Validation gate — exit 10 on any failure, no DB writes happen.
  const errors = await validateItems(items);
  if (errors.length > 0) {
    console.error(formatErrorsForCli(errors));
    console.error(
      `\nValidation failed: ${errors.length} error(s) across ${items.length} items. No database changes were made.`,
    );
    process.exit(10);
  }

  if (env.dryRun) {
    console.log(`Dry run: ${items.length} items would be upserted. No writes performed.`);
    return;
  }

  const client = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const payload = items.map(toRpcRow);
  const { data, error } = await client.rpc('seed_upsert_questions', { items: payload });
  if (error) throw new Error(`seed_upsert_questions RPC failed: ${error.message}`);
  const result = data as SeedResult;

  const elapsed = Date.now() - started;
  console.log(
    `Seed complete: ${result.inserted} inserted, ${result.updated} updated, ${result.unchanged} unchanged. Elapsed: ${elapsed}ms.`,
  );
}

function toRpcRow(i: LoadedItem) {
  return {
    id: i.id,
    type: i.type,
    domain: i.domain,
    topic: i.topic,
    difficulty: i.difficulty,
    source: i.source,
    reviewer_id: i.reviewer_id ?? '',
    reviewed_at: i.reviewed_at ?? '',
    content: i.content,
    content_hash: i.content_hash,
  };
}

main().catch((err: unknown) => {
  if (err instanceof EnvError) {
    console.error(err.message);
    process.exit(err.exitCode);
  }
  if (err instanceof DuplicateIdError) {
    console.error(err.message);
    process.exit(err.exitCode);
  }
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(12);
});
