import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { serviceRoleClient, userClient } from '../../tools/test-helpers/clients.js';
import { createTestUser, cleanupTestUsers, type TestUser } from '../../tools/test-helpers/users.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * T035 / FR-011 / SC-005:
 * Two users write progress and session rows. Each can read only their own.
 * Anonymous reads are covered by anon-no-read.test.ts.
 */
describe('RLS isolation between two users', () => {
  const admin = serviceRoleClient();
  let userA: TestUser;
  let userB: TestUser;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let aQuestionId: string;
  let bQuestionId: string;

  beforeAll(async () => {
    await cleanupTestUsers();
    [userA, userB] = await Promise.all([createTestUser('rls-a'), createTestUser('rls-b')]);
    [clientA, clientB] = await Promise.all([
      userClient(userA.email, userA.password),
      userClient(userB.email, userB.password),
    ]);

    // Pick two distinct question ids from the seeded bank.
    const { data } = await admin.from('questions').select('id').limit(2);
    aQuestionId = data![0]!.id;
    bQuestionId = data![1]!.id;

    // Each user writes their own progress + session row.
    const insertions = await Promise.all([
      clientA.from('user_progress').insert({
        user_id: userA.id,
        question_id: aQuestionId,
        times_seen: 1,
        times_correct: 1,
        last_rating: 'correct',
      }),
      clientB.from('user_progress').insert({
        user_id: userB.id,
        question_id: bQuestionId,
        times_seen: 1,
        times_correct: 0,
        last_rating: 'missed',
      }),
      clientA.from('sessions').insert({ user_id: userA.id, mode: 'mcq', score_pct: 100 }),
      clientB.from('sessions').insert({ user_id: userB.id, mode: 'flashcards', score_pct: 50 }),
    ]);
    for (const r of insertions) expect(r.error, JSON.stringify(r.error)).toBeNull();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  it('user A sees only their own user_progress rows', async () => {
    const { data, error } = await clientA.from('user_progress').select('user_id, last_rating');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(userA.id);
    expect(data![0]!.last_rating).toBe('correct');
  });

  it('user B sees only their own user_progress rows', async () => {
    const { data, error } = await clientB.from('user_progress').select('user_id, last_rating');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(userB.id);
    expect(data![0]!.last_rating).toBe('missed');
  });

  it('user A sees only their own sessions', async () => {
    const { data, error } = await clientA.from('sessions').select('user_id, mode, score_pct');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(userA.id);
    expect(data![0]!.mode).toBe('mcq');
  });

  it('user B sees only their own sessions', async () => {
    const { data, error } = await clientB.from('sessions').select('user_id, mode');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(userB.id);
    expect(data![0]!.mode).toBe('flashcards');
  });

  it("user B cannot insert a user_progress row with user A's id", async () => {
    const { error } = await clientB.from('user_progress').insert({
      user_id: userA.id,
      question_id: aQuestionId,
      times_seen: 99,
      times_correct: 99,
      last_rating: 'correct',
    });
    expect(error).not.toBeNull(); // RLS blocks the cross-user write
  });

  it('each user can read their own profile and not the other', async () => {
    const aOnA = await clientA.from('profiles').select('id').eq('id', userA.id);
    const aOnB = await clientA.from('profiles').select('id').eq('id', userB.id);
    expect(aOnA.data).toHaveLength(1);
    expect(aOnB.data).toEqual([]);
  });
});
