import { describe, it, expect, vi, beforeEach } from 'vitest';

const mutations = vi.hoisted(() => ({
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}));

vi.mock('../../src/lib/admin/mutations', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/admin/mutations')>(
    '../../src/lib/admin/mutations',
  );
  return { ...actual, ...mutations };
});

vi.mock('../../src/lib/supabase', () => ({
  supabase: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  }),
}));

import { useAdminQuestionsStore } from '../../src/lib/admin/useAdminQuestions';

function reset() {
  useAdminQuestionsStore.setState({ items: [], status: 'idle', error: null });
  mutations.createQuestion.mockReset();
  mutations.updateQuestion.mockReset();
  mutations.deleteQuestion.mockReset();
}

const itemA = {
  id: 'a',
  type: 'flashcard' as const,
  domain: 'ml-lifecycle',
  topic: 't',
  difficulty: 1,
  source: 'bank' as const,
  content: { front: 'f', back: 'b' },
};

describe('useAdminQuestionsStore', () => {
  beforeEach(reset);

  it('update applies optimistic patch before the network resolves', async () => {
    useAdminQuestionsStore.setState({ items: [itemA], status: 'ready' });
    let resolveNet: (v: typeof itemA) => void = () => {};
    mutations.updateQuestion.mockReturnValueOnce(new Promise<typeof itemA>((r) => (resolveNet = r)));

    const p = useAdminQuestionsStore.getState().update('a', { topic: 'new-topic' }, 'reviewer');

    expect(useAdminQuestionsStore.getState().items[0].topic).toBe('new-topic');

    resolveNet({ ...itemA, topic: 'server-confirmed' });
    await p;
    expect(useAdminQuestionsStore.getState().items[0].topic).toBe('server-confirmed');
  });

  it('update rolls back when the mutation rejects', async () => {
    useAdminQuestionsStore.setState({ items: [itemA], status: 'ready' });
    mutations.updateQuestion.mockRejectedValueOnce(new Error('rls denied'));

    await expect(
      useAdminQuestionsStore.getState().update('a', { topic: 'new-topic' }, 'reviewer'),
    ).rejects.toThrow('rls denied');

    expect(useAdminQuestionsStore.getState().items[0].topic).toBe('t');
  });

  it('remove optimistically drops the row and rolls back on rejection', async () => {
    useAdminQuestionsStore.setState({ items: [itemA], status: 'ready' });
    mutations.deleteQuestion.mockRejectedValueOnce(new Error('boom'));

    const p = useAdminQuestionsStore.getState().remove('a');
    expect(useAdminQuestionsStore.getState().items).toHaveLength(0);

    await expect(p).rejects.toThrow('boom');
    expect(useAdminQuestionsStore.getState().items).toHaveLength(1);
  });

  it('create appends the inserted row from the server', async () => {
    useAdminQuestionsStore.setState({ items: [], status: 'ready' });
    mutations.createQuestion.mockResolvedValueOnce({ ...itemA, id: 'new-id' });

    await useAdminQuestionsStore
      .getState()
      .create(
        { type: 'flashcard', domain: 'ml-lifecycle', topic: 't', difficulty: 1, source: 'bank', content: { front: 'f', back: 'b' } },
        'reviewer',
      );

    expect(useAdminQuestionsStore.getState().items).toHaveLength(1);
    expect(useAdminQuestionsStore.getState().items[0].id).toBe('new-id');
  });
});
