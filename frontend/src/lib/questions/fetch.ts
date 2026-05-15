import { supabase } from '../supabase';
import type { Question, Domain } from './types';

interface RawRow {
  id: string;
  type: Question['type'];
  domain: Domain;
  topic: string;
  difficulty: 1 | 2 | 3;
  content: Question['content'];
}

export async function fetchQuestions(filter: {
  type: Question['type'];
  domain?: Domain;
  topic?: string;
  difficulty?: 1 | 2 | 3;
}): Promise<Question[]> {
  let query = supabase().from('questions').select('id, type, domain, topic, difficulty, content').eq('type', filter.type);
  if (filter.domain) query = query.eq('domain', filter.domain);
  if (filter.topic) query = query.eq('topic', filter.topic);
  if (filter.difficulty) query = query.eq('difficulty', filter.difficulty);
  const { data, error } = await query;
  if (error) throw new Error(`fetchQuestions: ${error.message}`);
  return (data ?? []) as RawRow[] as Question[];
}

export async function fetchQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase()
    .from('questions')
    .select('id, type, domain, topic, difficulty, content')
    .in('id', ids);
  if (error) throw new Error(`fetchQuestionsByIds: ${error.message}`);
  return (data ?? []) as RawRow[] as Question[];
}
