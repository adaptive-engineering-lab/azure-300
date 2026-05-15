import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, readFile, copyFile, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promoteDraft } from '../../tools/author/lib/promote.js';

const CONTENT_DIR = resolve(__dirname, '..', '..', 'supabase', 'seed', 'content');
const FLASHCARDS = resolve(CONTENT_DIR, 'flashcards.json');

let backup: string;
let tmpDraft: string;

beforeEach(async () => {
  backup = await readFile(FLASHCARDS, 'utf8');
  const tmp = await mkdtemp(resolve(tmpdir(), 'author-test-'));
  tmpDraft = resolve(tmp, 'draft.json');
});

afterEach(async () => {
  await writeFile(FLASHCARDS, backup, 'utf8');
});

describe('author promote (feature 009)', () => {
  it('appends a valid item with reviewer stamps', async () => {
    const item = {
      id: '00000000-0000-4000-8000-000000aaaaaa',
      type: 'flashcard',
      domain: 'storage',
      topic: 'test',
      difficulty: 1,
      source: 'bank',
      content: { front: 'q', back: 'a' },
    };
    await writeFile(tmpDraft, JSON.stringify([item]), 'utf8');
    const report = await promoteDraft({ draftPath: tmpDraft, reviewer: 'la' });
    expect(report.appended.flashcard).toBe(1);

    const post = JSON.parse(await readFile(FLASHCARDS, 'utf8'));
    const found = post.find((x: { id: string }) => x.id === item.id);
    expect(found).toBeTruthy();
    expect(found.source).toBe('ai-generated');
    expect(found.reviewer_id).toBe('la');
    expect(found.reviewed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('aborts the whole promote on any validation failure', async () => {
    const valid = {
      id: '00000000-0000-4000-8000-000000bbbbbb',
      type: 'flashcard',
      domain: 'storage',
      topic: 'test',
      difficulty: 1,
      source: 'bank',
      content: { front: 'q', back: 'a' },
    };
    const bad = { ...valid, id: '00000000-0000-4000-8000-000000cccccc', domain: 'not-a-domain' };
    await writeFile(tmpDraft, JSON.stringify([valid, bad]), 'utf8');
    await expect(promoteDraft({ draftPath: tmpDraft, reviewer: 'la' })).rejects.toThrow(/Aborted before any write/);

    // The valid item must NOT have been written.
    const post = JSON.parse(await readFile(FLASHCARDS, 'utf8'));
    expect(post.find((x: { id: string }) => x.id === valid.id)).toBeUndefined();
  });

  it('rejects an empty draft', async () => {
    await writeFile(tmpDraft, '[]', 'utf8');
    await expect(promoteDraft({ draftPath: tmpDraft, reviewer: 'la' })).rejects.toThrow(/empty/);
  });

  it('rejects a promote without --reviewer', async () => {
    await writeFile(tmpDraft, '[]', 'utf8');
    await expect(promoteDraft({ draftPath: tmpDraft, reviewer: '' })).rejects.toThrow(/reviewer.*required/);
  });
});

void copyFile;
