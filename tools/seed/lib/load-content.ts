import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash } from './canonicalize.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTENT_DIR = resolve(HERE, '..', '..', '..', 'supabase', 'seed', 'content');

const DEFAULT_FILES = ['flashcards.json', 'mcq.json', 'product-id.json'] as const;

export interface QuestionItem {
  id: string;
  type: 'flashcard' | 'mcq' | 'product-id';
  domain: string;
  topic: string;
  difficulty: number;
  source: 'bank' | 'ai-generated';
  reviewer_id?: string;
  reviewed_at?: string;
  tags?: string[];
  content: Record<string, unknown>;
}

export interface LoadedItem extends QuestionItem {
  sourceFile: string;
  content_hash: string;
}

export class DuplicateIdError extends Error {
  readonly exitCode = 11;
}

/**
 * Detect duplicate ids across a list of (file, item) pairs. Returns the first
 * duplicate found (or null). Pure function — testable without filesystem.
 */
export function detectDuplicate(
  pairs: Array<{ file: string; item: QuestionItem }>,
): { id: string; firstFile: string; secondFile: string } | null {
  const seen = new Map<string, string>();
  for (const { file, item } of pairs) {
    const prev = seen.get(item.id);
    if (prev !== undefined) return { id: item.id, firstFile: prev, secondFile: file };
    seen.set(item.id, file);
  }
  return null;
}

export async function loadContent(contentDir = DEFAULT_CONTENT_DIR): Promise<LoadedItem[]> {
  const pairs: Array<{ file: string; item: QuestionItem }> = [];

  for (const file of DEFAULT_FILES) {
    const raw = await readFile(resolve(contentDir, file), 'utf8');
    const parsed = JSON.parse(raw) as QuestionItem[];
    for (const item of parsed) pairs.push({ file, item });
  }

  const dup = detectDuplicate(pairs);
  if (dup) {
    throw new DuplicateIdError(
      `Duplicate id ${dup.id}: present in both ${dup.firstFile} and ${dup.secondFile}`,
    );
  }

  return pairs.map(({ file, item }) => ({
    ...item,
    sourceFile: file,
    content_hash: contentHash(item.content),
  }));
}
