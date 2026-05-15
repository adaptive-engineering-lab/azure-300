import { supabase } from '../supabase';
import type { ItemType } from './validators';

export interface BankItem {
  id: string;
  type: ItemType;
  domain: string;
  topic: string;
  difficulty: number;
  source: 'bank' | 'ai-generated';
  reviewer_id?: string;
  reviewed_at?: string;
  content: Record<string, unknown>;
  content_hash?: string;
  created_at?: string;
}

export type NewQuestionInput = Omit<BankItem, 'id' | 'created_at' | 'content_hash' | 'reviewer_id' | 'reviewed_at'> & {
  id?: string;
};

export type QuestionPatch = Partial<
  Pick<BankItem, 'domain' | 'topic' | 'difficulty' | 'source' | 'content'>
>;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

async function contentHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createQuestion(input: NewQuestionInput, reviewerId: string): Promise<BankItem> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    type: input.type,
    domain: input.domain,
    topic: input.topic,
    difficulty: input.difficulty,
    source: input.source,
    content: input.content,
    content_hash: await contentHash(input.content),
    reviewer_id: reviewerId,
    reviewed_at: now,
  };
  const { data, error } = await supabase().from('questions').insert(row).select().single();
  if (error) throw error;
  return data as BankItem;
}

export async function updateQuestion(id: string, patch: QuestionPatch, reviewerId: string): Promise<BankItem> {
  const update: Record<string, unknown> = {
    ...patch,
    reviewer_id: reviewerId,
    reviewed_at: new Date().toISOString(),
  };
  if (patch.content !== undefined) {
    update.content_hash = await contentHash(patch.content);
  }
  const { data, error } = await supabase().from('questions').update(update).eq('id', id).select().single();
  if (error) throw error;
  return data as BankItem;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase().from('questions').delete().eq('id', id);
  if (error) throw error;
}
