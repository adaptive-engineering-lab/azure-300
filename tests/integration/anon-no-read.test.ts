import { describe, it, expect } from 'vitest';
import { anonClient } from '../../tools/test-helpers/clients.js';

/**
 * T036 / FR-012: an anonymous client must NOT be able to read or write
 * any per-user table. RLS returns zero rows rather than leaking the
 * existence of records via an error.
 */
describe('Anonymous clients cannot read or write user data tables', () => {
  const anon = anonClient();

  it('returns zero rows from user_progress', async () => {
    const { data, error } = await anon.from('user_progress').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('returns zero rows from sessions', async () => {
    const { data, error } = await anon.from('sessions').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('returns zero rows from profiles', async () => {
    const { data, error } = await anon.from('profiles').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('rejects an anonymous INSERT into user_progress', async () => {
    const { error } = await anon.from('user_progress').insert({
      user_id: '00000000-0000-4000-8000-000000000000',
      question_id: '00000000-0000-4000-8000-000000000000',
      times_seen: 0,
      times_correct: 0,
    });
    expect(error).not.toBeNull();
  });

  it('rejects an anonymous INSERT into sessions', async () => {
    const { error } = await anon.from('sessions').insert({
      user_id: '00000000-0000-4000-8000-000000000000',
      mode: 'mcq',
    });
    expect(error).not.toBeNull();
  });
});
