import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(HERE, '..', '..', '..', 'supabase', 'seed', 'content');

const FILES = ['flashcards.json', 'mcq.json', 'code-review.json'] as const;

export async function listExistingIds(): Promise<string[]> {
  const ids: string[] = [];
  for (const file of FILES) {
    try {
      const raw = await readFile(resolve(CONTENT_DIR, file), 'utf8');
      const arr = JSON.parse(raw) as Array<{ id: string }>;
      for (const item of arr) ids.push(item.id);
    } catch {
      // file missing — ignore
    }
  }
  return ids;
}
