import { describe, it, expect, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { anonClient, serviceRoleClient } from '../../tools/test-helpers/clients.js';

const exec = promisify(execFile);
const TOOLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tools');

async function runSeed(): Promise<{ stdout: string; stderr: string }> {
  return exec('pnpm', ['seed'], { cwd: TOOLS_DIR, env: process.env });
}

async function maxUpdatedAt(): Promise<string | null> {
  const { data, error } = await serviceRoleClient()
    .from('questions')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data!.created_at;
}

describe('Seed idempotency (T023 / SC-004 / FR-007)', () => {
  let beforeMax: string | null;
  let firstCount: number;

  beforeAll(async () => {
    // Make sure the bank exists. Subsequent runs in this test must be no-ops.
    await runSeed();
    beforeMax = await maxUpdatedAt();
    const { count } = await anonClient()
      .from('questions')
      .select('*', { count: 'exact', head: true });
    firstCount = count ?? 0;
    expect(firstCount).toBeGreaterThanOrEqual(50);
  });

  it('second run reports 0 inserted, 0 updated, N unchanged', async () => {
    const { stdout } = await runSeed();
    expect(stdout).toMatch(/0 inserted/);
    expect(stdout).toMatch(/0 updated/);
    expect(stdout).toMatch(new RegExp(`${firstCount} unchanged`));
  });

  it('row count and max created_at are unchanged after the no-op run', async () => {
    const { count } = await anonClient()
      .from('questions')
      .select('*', { count: 'exact', head: true });
    expect(count).toBe(firstCount);
    const afterMax = await maxUpdatedAt();
    expect(afterMax).toBe(beforeMax);
  });
});
