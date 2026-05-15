import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { serviceRoleClient } from '../../tools/test-helpers/clients.js';
import { createTestUser, cleanupTestUsers, type TestUser } from '../../tools/test-helpers/users.js';

describe('Profile auto-provision trigger (T034 / FR-014)', () => {
  let user: TestUser;
  const admin = serviceRoleClient();

  beforeAll(async () => {
    await cleanupTestUsers();
    user = await createTestUser('trigger');
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  it('creates exactly one profile row when an auth user is created', async () => {
    const { data, error } = await admin
      .from('profiles')
      .select('id, display_name, streak_days, last_active, level')
      .eq('id', user.id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('populates the profile with the spec defaults', async () => {
    const { data } = await admin
      .from('profiles')
      .select('display_name, streak_days, last_active, level')
      .eq('id', user.id)
      .single();
    expect(data!.display_name).toBe('');
    expect(data!.streak_days).toBe(0);
    expect(data!.last_active).toBeNull();
    expect(data!.level).toBe(1);
  });

  it('cascades the profile delete when the auth user is deleted', async () => {
    const throwaway = await createTestUser('cascade');
    const { data: before } = await admin
      .from('profiles')
      .select('id')
      .eq('id', throwaway.id);
    expect(before).toHaveLength(1);

    const { error: delErr } = await admin.auth.admin.deleteUser(throwaway.id);
    expect(delErr).toBeNull();

    const { data: after } = await admin.from('profiles').select('id').eq('id', throwaway.id);
    expect(after).toEqual([]);
  });
});
