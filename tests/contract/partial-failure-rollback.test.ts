import { describe, it, expect, beforeAll } from 'vitest';
import { serviceRoleClient } from '../../tools/test-helpers/clients.js';
import { contentHash } from '../../tools/seed/lib/canonicalize.js';

/**
 * T025 / FR-008 / Edge case "Re-seeding after a partial failure":
 * Calls the seed_upsert_questions RPC directly with a batch where one row
 * violates questions_domain_chk. Verifies the entire batch rolls back —
 * pre-existing rows are untouched, no new rows from the bad batch leak in.
 */
describe('Partial-failure rollback', () => {
  const admin = serviceRoleClient();
  let preCount: number;
  let preMaxCreated: string | null;
  const newIds: string[] = [
    '00000000-1111-4111-8111-000000000001',
    '00000000-1111-4111-8111-000000000002',
    '00000000-1111-4111-8111-000000000003',
    '00000000-1111-4111-8111-000000000004',
    '00000000-1111-4111-8111-000000000005',
  ];

  function buildRow(id: string, opts: { domain: string }) {
    const content = { front: `Pre-test front ${id}`, back: `Pre-test back ${id}` };
    return {
      id,
      type: 'flashcard',
      domain: opts.domain,
      topic: 'rollback-test',
      difficulty: 1,
      source: 'bank',
      reviewer_id: '',
      reviewed_at: '',
      content,
      content_hash: contentHash(content),
    };
  }

  beforeAll(async () => {
    // Defensive cleanup in case a previous test run left rollback rows behind.
    await admin.from('questions').delete().in('id', newIds);
    const { count } = await admin.from('questions').select('*', { count: 'exact', head: true });
    preCount = count ?? 0;
    const { data } = await admin
      .from('questions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    preMaxCreated = data?.created_at ?? null;
  });

  it('aborts the whole batch when item #3 violates a CHECK constraint', async () => {
    const items = [
      buildRow(newIds[0]!, { domain: 'storage' }),
      buildRow(newIds[1]!, { domain: 'compute' }),
      buildRow(newIds[2]!, { domain: 'not-a-domain' }), // violates questions_domain_chk
      buildRow(newIds[3]!, { domain: 'networking' }),
      buildRow(newIds[4]!, { domain: 'monitoring' }),
    ];

    const { error } = await admin.rpc('seed_upsert_questions', { items });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/questions_domain_chk|check constraint|violates/i);
  });

  it('leaves the existing bank size unchanged after the failed batch', async () => {
    const { count } = await admin.from('questions').select('*', { count: 'exact', head: true });
    expect(count).toBe(preCount);
  });

  it('does not leak any of the 5 attempted rows into the table', async () => {
    const { data } = await admin.from('questions').select('id').in('id', newIds);
    expect(data ?? []).toEqual([]);
  });

  it('does not bump max created_at — no partial writes touched the table', async () => {
    const { data } = await admin
      .from('questions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(data?.created_at ?? null).toBe(preMaxCreated);
  });
});
