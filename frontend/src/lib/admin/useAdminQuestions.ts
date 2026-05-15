import { useEffect } from 'react';
import { create } from 'zustand';
import { supabase } from '../supabase';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type BankItem,
  type NewQuestionInput,
  type QuestionPatch,
} from './mutations';

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface AdminQuestionsState {
  items: BankItem[];
  status: Status;
  error: string | null;
  load: () => Promise<void>;
  create: (input: NewQuestionInput, reviewerId: string) => Promise<BankItem>;
  update: (id: string, patch: QuestionPatch, reviewerId: string) => Promise<BankItem>;
  remove: (id: string) => Promise<void>;
}

export const useAdminQuestionsStore = create<AdminQuestionsState>((set, get) => ({
  items: [],
  status: 'idle',
  error: null,

  load: async () => {
    set({ status: 'loading', error: null });
    const { data, error } = await supabase()
      .from('questions')
      .select('id, type, domain, topic, difficulty, source, reviewer_id, reviewed_at, content, content_hash, created_at')
      .order('type', { ascending: true })
      .order('topic', { ascending: true });
    if (error) {
      set({ status: 'error', error: error.message });
      return;
    }
    set({ items: (data ?? []) as BankItem[], status: 'ready' });
  },

  create: async (input, reviewerId) => {
    const inserted = await createQuestion(input, reviewerId);
    set((s) => ({ items: [...s.items, inserted] }));
    return inserted;
  },

  update: async (id, patch, reviewerId) => {
    const prev = get().items;
    // Optimistic: apply patch immediately, roll back on failure.
    set({
      items: prev.map((it) =>
        it.id === id ? { ...it, ...patch, reviewer_id: reviewerId, reviewed_at: new Date().toISOString() } : it,
      ),
    });
    try {
      const updated = await updateQuestion(id, patch, reviewerId);
      set((s) => ({ items: s.items.map((it) => (it.id === id ? updated : it)) }));
      return updated;
    } catch (err) {
      set({ items: prev });
      throw err;
    }
  },

  remove: async (id) => {
    const prev = get().items;
    set({ items: prev.filter((it) => it.id !== id) });
    try {
      await deleteQuestion(id);
    } catch (err) {
      set({ items: prev });
      throw err;
    }
  },
}));

export function useAdminQuestions() {
  const store = useAdminQuestionsStore();
  useEffect(() => {
    if (store.status === 'idle') store.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return store;
}
