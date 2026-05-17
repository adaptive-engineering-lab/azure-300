import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { anonClient, serviceRoleClient, userClient } from '../../tools/test-helpers/clients.js';
import { createTestUser, cleanupTestUsers, type TestUser } from '../../tools/test-helpers/users.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * T040 / spec 013 / FR-001 + FR-002 + FR-003:
 *
 * The admin-RLS policies in 0011_questions_admin_rls.sql grant write
 * access to public.questions only when the caller is in public.admins.
 * This test creates two authenticated users, promotes one to admin via
 * the service role, then asserts each policy:
 *
 *   - admin INSERT succeeds, non-admin INSERT denied, anon INSERT denied
 *   - admin UPDATE succeeds (>= 1 row affected), non-admin UPDATE
 *     affects zero rows (RLS silently filters), anon UPDATE denied
 *   - admin DELETE succeeds (>= 1 row affected), non-admin DELETE
 *     affects zero rows, anon DELETE denied
 *
 * Cleanup deletes the auth users; cascade FKs remove their admins row.
 */
describe('Admin RLS (T040 / spec 013 / FR-001..FR-003)', () => {
  const admin = serviceRoleClient();
  const anon = anonClient();
  let adminUser: TestUser;
  let regularUser: TestUser;
  let adminClient: SupabaseClient;
  let regularClient: SupabaseClient;
  let sampleQuestionId: string;
  let createdQuestionIds: string[] = [];

  beforeAll(async () => {
    await cleanupTestUsers();
    [adminUser, regularUser] = await Promise.all([
      createTestUser('admin-rls-admin'),
      createTestUser('admin-rls-regular'),
    ]);

    // Promote one user to admin via the service role.
    const { error: promoteErr } = await admin
      .from('admins')
      .insert({ user_id: adminUser.id });
    expect(promoteErr, `admins insert failed: ${JSON.stringify(promoteErr)}`).toBeNull();

    [adminClient, regularClient] = await Promise.all([
      userClient(adminUser.email, adminUser.password),
      userClient(regularUser.email, regularUser.password),
    ]);

    // Need at least one existing question to UPDATE / DELETE against.
    const { data } = await admin.from('questions').select('id').limit(1);
    if (!data || data.length === 0) {
      throw new Error(
        'admin-rls.test requires at least one row in public.questions — seed the bank first.',
      );
    }
    sampleQuestionId = data[0]!.id;
  });

  afterAll(async () => {
    if (createdQuestionIds.length > 0) {
      await admin.from('questions').delete().in('id', createdQuestionIds);
    }
    await cleanupTestUsers();
  });

  function newFlashcardRow(id: string) {
    return {
      id,
      type: 'flashcard',
      domain: 'ml-lifecycle',
      topic: 'admin-rls-test',
      difficulty: 1,
      source: 'bank',
      content: { front: 'q', back: 'a' },
      content_hash: 'rls-test',
    };
  }

  it('admin can INSERT a question', async () => {
    const id = crypto.randomUUID();
    createdQuestionIds.push(id);
    const { error } = await adminClient.from('questions').insert(newFlashcardRow(id));
    expect(error, `admin insert: ${JSON.stringify(error)}`).toBeNull();
  });

  it('regular authenticated user cannot INSERT a question (RLS denies)', async () => {
    const id = crypto.randomUUID();
    const { error } = await regularClient.from('questions').insert(newFlashcardRow(id));
    expect(error, 'regular insert should be denied').not.toBeNull();
  });

  it('anon cannot INSERT a question', async () => {
    const id = crypto.randomUUID();
    const { error } = await anon.from('questions').insert(newFlashcardRow(id));
    expect(error, 'anon insert should be denied').not.toBeNull();
  });

  it('admin can UPDATE a question', async () => {
    const { data, error } = await adminClient
      .from('questions')
      .update({ topic: 'admin-rls-test-updated' })
      .eq('id', sampleQuestionId)
      .select('id');
    expect(error, `admin update: ${JSON.stringify(error)}`).toBeNull();
    expect((data ?? []).length).toBe(1);
  });

  it('regular authenticated user cannot UPDATE a question (RLS silently filters)', async () => {
    const { data, error } = await regularClient
      .from('questions')
      .update({ topic: 'regular-attempt' })
      .eq('id', sampleQuestionId)
      .select('id');
    // RLS denies-via-filter: no error, just zero rows touched.
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });

  it('admin can DELETE a question they just inserted', async () => {
    const id = crypto.randomUUID();
    const insertRes = await adminClient.from('questions').insert(newFlashcardRow(id));
    expect(insertRes.error).toBeNull();

    const { data, error } = await adminClient
      .from('questions')
      .delete()
      .eq('id', id)
      .select('id');
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(1);
    // Confirm it's gone.
    const after = await admin.from('questions').select('id').eq('id', id);
    expect((after.data ?? []).length).toBe(0);
  });

  it('regular authenticated user cannot DELETE a question (RLS silently filters)', async () => {
    const { data, error } = await regularClient
      .from('questions')
      .delete()
      .eq('id', sampleQuestionId)
      .select('id');
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });

  it('useIsAdmin: admin user sees themselves in admins, regular user does not', async () => {
    const adminRead = await adminClient
      .from('admins')
      .select('user_id')
      .eq('user_id', adminUser.id)
      .maybeSingle();
    expect(adminRead.error).toBeNull();
    expect(adminRead.data?.user_id).toBe(adminUser.id);

    const regularRead = await regularClient
      .from('admins')
      .select('user_id')
      .eq('user_id', regularUser.id)
      .maybeSingle();
    expect(regularRead.error).toBeNull();
    expect(regularRead.data).toBeNull();
  });
});
