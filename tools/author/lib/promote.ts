import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getValidator, type ItemType } from './schemas.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(HERE, '..', '..', '..', 'supabase', 'seed', 'content');

const FILES: Record<ItemType, string> = {
  flashcard: 'flashcards.json',
  mcq: 'mcq.json',
  'product-id': 'product-id.json',
};

export interface PromoteArgs {
  draftPath: string;
  reviewer: string; // initials or short identifier
  now?: Date;
}

export interface PromoteReport {
  appended: Record<ItemType, number>;
  total: number;
}

export async function promoteDraft({ draftPath, reviewer, now }: PromoteArgs): Promise<PromoteReport> {
  if (!reviewer || reviewer.trim().length === 0) {
    throw new Error('--reviewer is required.');
  }
  const raw = await readFile(draftPath, 'utf8');
  const items = JSON.parse(raw) as Array<Record<string, unknown>>;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Draft file is empty or not an array.');
  }

  const ts = (now ?? new Date()).toISOString();
  const stamped: Record<ItemType, Array<Record<string, unknown>>> = {
    flashcard: [],
    mcq: [],
    'product-id': [],
  };

  // Re-validate every item before any write (atomic).
  for (const item of items) {
    const type = item.type as ItemType | undefined;
    if (!type || !(type in stamped)) {
      throw new Error(`Item ${(item.id as string) ?? '?'} has unknown type "${item.type}". Aborted before any write.`);
    }
    const stampedItem = {
      ...item,
      source: 'ai-generated',
      reviewer_id: reviewer,
      reviewed_at: ts,
    };
    const { validate } = await getValidator(type);
    if (!validate(stampedItem)) {
      const first = validate.errors?.[0];
      throw new Error(
        `Item ${item.id} failed schema validation after stamping: ${first?.instancePath} ${first?.message}. Aborted before any write.`,
      );
    }
    stamped[type].push(stampedItem);
  }

  // All valid — append to seed files.
  const appended: PromoteReport['appended'] = { flashcard: 0, mcq: 0, 'product-id': 0 };
  for (const type of Object.keys(FILES) as ItemType[]) {
    if (stamped[type].length === 0) continue;
    const path = resolve(CONTENT_DIR, FILES[type]);
    const existingRaw = await readFile(path, 'utf8');
    const existing = JSON.parse(existingRaw) as Array<Record<string, unknown>>;
    const merged = [...existing, ...stamped[type]];
    await writeFile(path, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    appended[type] = stamped[type].length;
  }

  return { appended, total: items.length };
}
