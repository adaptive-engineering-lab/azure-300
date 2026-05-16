import { describe, it, expect, vi, beforeEach } from 'vitest';

type Call = { table: string; method: string; args: unknown[] };
let calls: Call[];
let nextResult: { data: unknown; error: unknown };

vi.mock('../../src/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {};
    const proxy = new Proxy(c, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown) => resolve(nextResult);
        }
        return (...args: unknown[]) => {
          calls.push({ table, method: prop, args });
          return proxy;
        };
      },
    });
    return proxy;
  }
  return {
    supabase: () => ({
      from: (table: string) => chain(table),
    }),
  };
});

import { createQuestion, updateQuestion, deleteQuestion } from '../../src/lib/admin/mutations';

beforeEach(() => {
  calls = [];
  nextResult = { data: null, error: null };
});

describe('admin mutations', () => {
  it('createQuestion inserts with stamped reviewer/reviewed_at and a sha256 content_hash', async () => {
    nextResult = {
      data: { id: 'fixed-id', type: 'flashcard', topic: 't', difficulty: 1, domain: 'ml-lifecycle', source: 'bank', content: { a: 1 } },
      error: null,
    };
    await createQuestion(
      { type: 'flashcard', domain: 'ml-lifecycle', topic: 't', difficulty: 1, source: 'bank', content: { a: 1 } },
      'lanre@example.com',
    );

    const insertCall = calls.find((c) => c.method === 'insert');
    expect(insertCall).toBeDefined();
    const row = insertCall!.args[0] as Record<string, unknown>;
    expect(row.reviewer_id).toBe('lanre@example.com');
    expect(typeof row.reviewed_at).toBe('string');
    expect(row.content_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof row.id).toBe('string');
    expect((row.id as string).length).toBe(36);
  });

  it('updateQuestion sets reviewer_id, reviewed_at, and a recomputed content_hash when content changes', async () => {
    nextResult = { data: { id: 'x' }, error: null };
    await updateQuestion('abc-id', { content: { hello: 'world' }, topic: 'new' }, 'lanre@example.com');

    const updateCall = calls.find((c) => c.method === 'update');
    expect(updateCall).toBeDefined();
    const patch = updateCall!.args[0] as Record<string, unknown>;
    expect(patch.topic).toBe('new');
    expect(patch.reviewer_id).toBe('lanre@example.com');
    expect(typeof patch.reviewed_at).toBe('string');
    expect(patch.content_hash).toMatch(/^[0-9a-f]{64}$/);

    const eqCall = calls.find((c) => c.method === 'eq');
    expect(eqCall?.args).toEqual(['id', 'abc-id']);
  });

  it('updateQuestion omits content_hash when content is not in the patch', async () => {
    nextResult = { data: { id: 'x' }, error: null };
    await updateQuestion('abc-id', { topic: 'new' }, 'lanre@example.com');

    const updateCall = calls.find((c) => c.method === 'update');
    const patch = updateCall!.args[0] as Record<string, unknown>;
    expect('content_hash' in patch).toBe(false);
  });

  it('deleteQuestion deletes by id', async () => {
    nextResult = { data: null, error: null };
    await deleteQuestion('abc-id');

    expect(calls.some((c) => c.method === 'delete')).toBe(true);
    const eqCall = calls.find((c) => c.method === 'eq');
    expect(eqCall?.args).toEqual(['id', 'abc-id']);
  });

  it('createQuestion throws when supabase returns an error', async () => {
    nextResult = { data: null, error: { message: 'rls denied' } };
    await expect(
      createQuestion(
        { type: 'flashcard', domain: 'ml-lifecycle', topic: 't', difficulty: 1, source: 'bank', content: {} },
        'x',
      ),
    ).rejects.toMatchObject({ message: 'rls denied' });
  });

  it('content_hash is deterministic under key reordering', async () => {
    nextResult = { data: { id: 'x' }, error: null };
    await updateQuestion('id', { content: { a: 1, b: 2 } }, 'u');
    const h1 = (calls.find((c) => c.method === 'update')!.args[0] as Record<string, unknown>).content_hash;
    calls = [];
    await updateQuestion('id', { content: { b: 2, a: 1 } }, 'u');
    const h2 = (calls.find((c) => c.method === 'update')!.args[0] as Record<string, unknown>).content_hash;
    expect(h1).toBe(h2);
  });
});
